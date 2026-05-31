#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "tmpdir"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SCRIPT = File.join(ROOT, "scripts/lint-openapi.rb")
FIXTURES = File.join(ROOT, "test/fixtures/openapi")

class OpenApiLintTest < Minitest::Test
  def test_accepts_minimal_valid_openapi_document
    Dir.mktmpdir do |dir|
      spec = write_yaml(dir, "valid.yaml", valid_spec)

      stdout, stderr, status = run_script(spec)

      assert status.success?, stderr
      assert_match(/openapi-lint: OK/, stdout)
    end
  end

  def test_rejects_duplicate_yaml_mapping_keys
    _stdout, stderr, status = run_script(File.join(FIXTURES, "duplicate-key.yaml"))

    refute status.success?
    assert_match(/duplicate key/i, stderr)
  end

  def test_rejects_unresolved_local_refs
    _stdout, stderr, status = run_script(File.join(FIXTURES, "unresolved-ref.yaml"))

    refute status.success?
    assert_match(/unresolved local \$ref/i, stderr)
  end

  def test_rejects_missing_operation_id
    _stdout, stderr, status = run_script(File.join(FIXTURES, "missing-operation-id.yaml"))

    refute status.success?
    assert_match(/missing operationId/i, stderr)
  end

  def test_rejects_document_without_openapi_version
    Dir.mktmpdir do |dir|
      spec = valid_spec
      spec.delete("openapi")
      path = write_yaml(dir, "missing-openapi.yaml", spec)

      _stdout, stderr, status = run_script(path)

      refute status.success?
      assert_match(/missing openapi/i, stderr)
    end
  end

  def test_rejects_duplicate_operation_id
    Dir.mktmpdir do |dir|
      spec = valid_spec
      spec["paths"]["/v1/public/other"] = {
        "get" => valid_operation("listSpaces")
      }
      path = write_yaml(dir, "duplicate-operation-id.yaml", spec)

      _stdout, stderr, status = run_script(path)

      refute status.success?
      assert_match(/duplicate operationId/i, stderr)
    end
  end

  def test_rejects_path_template_without_matching_path_parameter
    Dir.mktmpdir do |dir|
      spec = valid_spec
      spec["paths"]["/v1/public/spaces/{spaceId}"] = {
        "get" => valid_operation("getSpace")
      }
      path = write_yaml(dir, "missing-path-param.yaml", spec)

      _stdout, stderr, status = run_script(path)

      refute status.success?
      assert_match(/missing path parameter/i, stderr)
    end
  end

  def test_rejects_legacy_extension_names
    Dir.mktmpdir do |dir|
      spec = valid_spec
      legacy_prefix = "x-" + "spea" + "keasy-"
      spec["paths"]["/v1/public/spaces"]["get"]["#{legacy_prefix}mcp"] = { "name" => "plaky_list_spaces" }
      path = write_yaml(dir, "legacy-extension.yaml", spec)

      _stdout, stderr, status = run_script(path)

      refute status.success?
      assert_match(/legacy extension/i, stderr)
    end
  end

  private

  def run_script(*args)
    Open3.capture3("ruby", SCRIPT, *args, chdir: ROOT)
  end

  def write_yaml(dir, name, payload)
    path = File.join(dir, name)
    File.write(path, YAML.dump(payload))
    path
  end

  def valid_spec
    {
      "openapi" => "3.1.0",
      "info" => { "title" => "Valid", "version" => "1.0.0" },
      "paths" => {
        "/v1/public/spaces" => {
          "get" => valid_operation("listSpaces")
        }
      },
      "components" => {
        "schemas" => {
          "SpaceResponse" => { "type" => "object" }
        }
      }
    }
  end

  def valid_operation(operation_id)
    {
      "operationId" => operation_id,
      "summary" => "List workspace spaces",
      "parameters" => [],
      "responses" => {
        "200" => {
          "description" => "OK",
          "content" => {
            "application/json" => {
              "schema" => { "$ref" => "#/components/schemas/SpaceResponse" }
            }
          }
        }
      },
      "x-plaky115-mcp" => {
        "name" => "plaky_list_spaces",
        "scopes" => ["read"],
        "readOnlyHint" => true,
        "destructiveHint" => false,
        "idempotentHint" => true,
        "openWorldHint" => true
      }
    }
  end
end
