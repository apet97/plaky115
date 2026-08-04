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
