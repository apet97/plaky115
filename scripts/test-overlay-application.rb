#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "json"
require "minitest/autorun"
require "open3"
require "tmpdir"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SCRIPT = File.join(ROOT, "scripts/apply-overlay.rb")

class OverlayApplicationTest < Minitest::Test
  def test_repository_overlay_produces_exact_expected_operation_set
    Dir.mktmpdir do |dir|
      out = File.join(dir, "dx.yaml")
      _stdout, stderr, status = run_script(
        "--source", File.join(ROOT, "api-1.yaml"),
        "--overlay", File.join(ROOT, "overlays/plaky115-dx.overlay.yaml"),
        "--out", out
      )
      assert status.success?, stderr

      expected = JSON.parse(File.read(File.join(ROOT, "openapi/plaky115-expected-operations.json")))
                     .fetch("operations")
                     .map { |operation| [operation.fetch("operationId"), operation.fetch("method"), operation.fetch("path")] }
                     .sort
      actual = []
      load_yaml_file(out).fetch("paths").each do |path, path_item|
        path_item.each do |method, operation|
          next unless HTTP_METHODS.include?(method)

          actual << [operation.fetch("operationId"), method.upcase, path]
        end
      end
      assert_equal expected, actual.sort
    end
  end

  def test_updates_info_and_exact_operation_targets
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", base_spec)
      overlay = write_yaml(dir, "overlay.yaml", {
        "overlay" => "1.0.0",
        "info" => { "title" => "Fixture", "version" => "1.0.0" },
        "actions" => [
          { "target" => "$.info", "update" => { "title" => "Plaky115 Public API" } },
          {
            "target" => "$.paths[\"/v1/public/spaces\"].get",
            "update" => {
              "operationId" => "listSpaces",
              "summary" => "List workspace spaces"
            }
          }
        ]
      })
      out = File.join(dir, "out.yaml")

      stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--out", out)

      assert status.success?, stderr
      assert_match(/overlay-apply: OK/, stdout)
      result = YAML.safe_load(File.read(out), aliases: true)
      assert_equal "Plaky115 Public API", result.dig("info", "title")
      assert_equal "listSpaces", result.dig("paths", "/v1/public/spaces", "get", "operationId")
      assert_equal "List workspace spaces", result.dig("paths", "/v1/public/spaces", "get", "summary")
    end
  end

  def test_rejects_unmatched_target
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", base_spec)
      overlay = write_yaml(dir, "overlay.yaml", {
        "overlay" => "1.0.0",
        "info" => { "title" => "Fixture", "version" => "1.0.0" },
        "actions" => [
          { "target" => "$.paths[\"/v1/public/missing\"].get", "update" => { "operationId" => "missing" } }
        ]
      })

      _stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--check")

      refute status.success?
      assert_match(/unmatched target/i, stderr)
    end
  end

  def test_rejects_unsupported_target_with_action_index_without_partial_output
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", base_spec)
      overlay = write_yaml(dir, "overlay.yaml", {
        "overlay" => "1.0.0",
        "info" => { "title" => "Fixture", "version" => "1.0.0" },
        "actions" => [
          { "target" => "$.info", "update" => { "title" => "Changed" } },
          { "target" => "$.paths[*].get", "update" => { "summary" => "Unsupported" } },
        ]
      })
      out = File.join(dir, "out.yaml")

      _stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--out", out)

      refute status.success?
      assert_match(/action 2.*\$\.paths\[\*\]\.get/i, stderr)
      refute File.exist?(out)
    end
  end

  def test_rejects_invalid_remove_rules_before_applying
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", base_spec)
      overlay = write_yaml(dir, "overlay.yaml", {
        "overlay" => "1.0.0",
        "info" => { "title" => "Fixture", "version" => "1.0.0" },
        "actions" => [{ "target" => "$.info", "remove" => false }]
      })

      _stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--check")

      refute status.success?
      assert_match(/remove: false requires update/i, stderr)
    end
  end

  def test_resolves_components_nested_payloads_named_parameters_and_escaped_keys
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", {
        "openapi" => "3.1.0",
        "info" => { "title" => "Fixture", "version" => "1.0.0" },
        "components" => {
          "schemas" => {
            "Widget" => {
              "type" => "object",
              "properties" => { "label" => { "type" => "string" } },
              "required" => ["label"],
            },
            "A/B~C" => { "type" => "object" },
          }
        },
        "paths" => {
          "/fixture" => {
            "post" => {
              "parameters" => [{
                "name" => "page", "in" => "query", "schema" => { "type" => "integer" }
              }],
              "requestBody" => {
                "content" => { "application/json" => { "schema" => { "type" => "object" } } }
              },
              "responses" => {
                "200" => {
                  "description" => "OK",
                  "content" => { "application/json" => { "schema" => { "type" => "object" } } }
                }
              }
            }
          }
        }
      })
      overlay = write_yaml(dir, "overlay.yaml", {
        "overlay" => "1.0.0",
        "info" => { "title" => "Fixture overlay", "version" => "1.0.0" },
        "actions" => [
          { "target" => "$.components.schemas[\"Widget\"].properties[\"label\"]", "update" => { "minLength" => 1 } },
          { "target" => "$.components.schemas[\"Widget\"]", "update" => { "required" => %w[label status] } },
          { "target" => "$.components.schemas[\"A/B~C\"]", "update" => { "description" => "Escaped key" } },
          { "target" => "$.paths[\"/fixture\"].post.parameters[\"query:page\"].schema", "update" => { "minimum" => 1 } },
          { "target" => "$.paths[\"/fixture\"].post.requestBody.content[\"application/json\"].schema", "update" => { "additionalProperties" => true } },
          { "target" => "$.paths[\"/fixture\"].post.responses[\"200\"].content[\"application/json\"].schema", "update" => { "minProperties" => 0 } },
        ]
      })
      out = File.join(dir, "out.yaml")

      _stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--out", out)

      assert status.success?, stderr
      result = load_yaml_file(out)
      assert_equal 1, result.dig("components", "schemas", "Widget", "properties", "label", "minLength")
      assert_equal %w[label status], result.dig("components", "schemas", "Widget", "required")
      assert_equal "Escaped key", result.dig("components", "schemas", "A/B~C", "description")
      assert_equal 1, result.dig("paths", "/fixture", "post", "parameters", 0, "schema", "minimum")
      assert_equal true, result.dig("paths", "/fixture", "post", "requestBody", "content", "application/json", "schema", "additionalProperties")
      assert_equal 0, result.dig("paths", "/fixture", "post", "responses", "200", "content", "application/json", "schema", "minProperties")
    end
  end

  def test_reconciled_contract_has_evidence_backed_corrections_and_negative_guards
    Dir.mktmpdir do |dir|
      out = File.join(dir, "dx.yaml")
      _stdout, stderr, status = run_script(
        "--source", File.join(ROOT, "api-1.yaml"),
        "--overlay", File.join(ROOT, "overlays/plaky115-dx.overlay.yaml"),
        "--out", out
      )
      assert status.success?, stderr
      spec = load_yaml_file(out)
      schemas = spec.fetch("components").fetch("schemas")

      bulk = spec.dig("paths", "/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields", "patch", "requestBody", "content", "application/json", "schema")
      assert_equal "object", bulk.fetch("type")
      assert_equal true, bulk.fetch("additionalProperties")
      refute bulk.key?("minProperties")

      assert_equal %w[title color], schemas.fetch("ItemGroupCreateRequest").fetch("required")
      assert_equal %w[title ranking color], schemas.fetch("ItemGroupUpdateRequest").fetch("required")
      refute_includes schemas.fetch("ItemGroupCreateRequest").fetch("required"), "ranking"
      refute_includes schemas.fetch("ItemCreateRequest").fetch("required", []), "title"

      upload = spec.dig("paths", "/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files", "post")
      assert_equal true, upload.dig("requestBody", "required")
      assert_equal true, upload.dig("requestBody", "content", "multipart/form-data", "schema", "properties", "file", "format") == "binary"
      assert_equal 255, upload.dig("x-plaky115-filename-policy", "maxUtf8Bytes")
      assert_equal "conservative-local-policy", upload.dig("x-plaky115-filename-policy", "evidence")

      %w[Board ItemGroup Item Space Team User].each do |name|
        paged = schemas.fetch("PublicPagedResponseV1#{name}Response")
        assert_equal %w[data hasMore], paged.fetch("required"), name
      end

      %w[/v1/public/spaces /v1/public/spaces/{spaceId}/boards /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups /v1/public/spaces/{spaceId}/boards/{boardId}/items /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items /v1/public/teams /v1/public/users].each do |path|
        operation = spec.dig("paths", path, "get")
        page = Array(operation["parameters"]).find { |parameter| parameter["name"] == "page" }
        page_size = Array(operation["parameters"]).find { |parameter| parameter["name"] == "pageSize" }
        assert_equal 1, page.dig("schema", "minimum"), path
        assert_equal 2_147_483_647, page.dig("schema", "maximum"), path
        assert_equal 1, page_size.dig("schema", "minimum"), path
        refute page_size.dig("schema").key?("maximum"), path
      end

      assert_equal "object", schemas.fetch("TeamShortResponse").fetch("type")
      assert_equal({}, schemas.dig("UserDetails", "properties", "customFields", "items"))
      assert_equal "unverified", schemas.dig("UserDetails", "properties", "customFields", "x-plaky115-evidence")
      variants = schemas.fetch("ItemAttributeDefinition").fetch("anyOf")
      assert variants.any? { |variant| variant.dig("properties", "type", "const") == "NUMBER" }
      assert variants.any? { |variant| variant.dig("properties", "type", "type") == "string" }

      assert_equal ["string", "null"], schemas.dig("SpaceResponse", "properties", "iconUrl", "type")
      assert_equal ["boolean", "null"], schemas.dig("ItemResponse", "properties", "deleted", "type")
      assert_equal true, schemas.key?("PlakyErrorResponse")
      assert_equal true, schemas.fetch("PlakyErrorResponse").key?("anyOf")
    end
  end

  def test_rejects_duplicate_yaml_mapping_keys_in_overlay
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", base_spec)
      overlay = File.join(dir, "overlay.yaml")
      File.write(overlay, <<~YAML)
        overlay: 1.0.0
        actions:
          - target: $.info
            update:
              title: First
              title: Second
      YAML

      _stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--check")

      refute status.success?
      assert_match(/duplicate key/i, stderr)
    end
  end

  def test_rejects_openapi_root_key_from_overlay_document
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", base_spec)
      overlay = write_yaml(dir, "overlay.yaml", {
        "openapi" => "3.1.0",
        "overlay" => "1.0.0",
        "info" => { "title" => "Fixture", "version" => "1.0.0" },
        "actions" => [],
      })

      _stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--check")

      refute status.success?
      assert_match(/overlay root|unsupported root key|openapi/i, stderr)
    end
  end

  def test_deep_merges_nested_hashes_without_dropping_sibling_keys
    Dir.mktmpdir do |dir|
      source = write_yaml(dir, "source.yaml", base_spec)
      overlay = write_yaml(dir, "overlay.yaml", {
        "overlay" => "1.0.0",
        "info" => { "title" => "Fixture", "version" => "1.0.0" },
        "actions" => [
          {
            "target" => "$.paths[\"/v1/public/spaces\"].get",
            "update" => {
              "responses" => {
                "200" => {
                  "content" => {
                    "application/json" => {
                      "example" => { "data" => [] }
                    }
                  }
                }
              }
            }
          }
        ]
      })
      out = File.join(dir, "out.yaml")

      _stdout, stderr, status = run_script("--source", source, "--overlay", overlay, "--out", out)

      assert status.success?, stderr
      result = YAML.safe_load(File.read(out), aliases: true)
      response = result.dig("paths", "/v1/public/spaces", "get", "responses", "200")
      assert_equal "OK", response.fetch("description")
      assert_equal({ "data" => [] }, response.dig("content", "application/json", "example"))
      assert_equal({ "type" => "object" }, response.dig("content", "application/json", "schema"))
    end
  end

  private

  HTTP_METHODS = %w[get post put patch delete head options trace].freeze

  def run_script(*args)
    Open3.capture3("ruby", SCRIPT, *args, chdir: ROOT)
  end

  def write_yaml(dir, name, payload)
    path = File.join(dir, name)
    File.write(path, YAML.dump(payload))
    path
  end

  def load_yaml_file(path)
    YAML.safe_load(File.read(path), aliases: true)
  end

  def base_spec
    {
      "openapi" => "3.1.0",
      "info" => { "title" => "Plaky API", "version" => "v1" },
      "paths" => {
        "/v1/public/spaces" => {
          "get" => {
            "operationId" => "getSpaces",
            "summary" => "Get spaces",
            "parameters" => [],
            "responses" => {
              "200" => {
                "description" => "OK",
                "content" => {
                  "application/json" => {
                    "schema" => { "type" => "object" }
                  }
                }
              }
            }
          }
        }
      }
    }
  end
end
