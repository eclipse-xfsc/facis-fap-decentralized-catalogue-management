@bdd @prompts @prompt-testing
Feature: Prompt assets, lifecycle and dry-run testing
  Prompt templates must be immutable by version and executable through a configured provider.

  Background:
    Given an authenticated user with Schema Registry access

  @creation
  Scenario: Create a non-confidential prompt template
    Given prompt name "QA Public Dataset Mapping Prompt"
    And author "QA Automation"
    And version "1.0.0"
    And status "Draft"
    And template "Transform {SOURCE_ASSET} into {TARGET_SCHEMA}"
    When the prompt is saved
    Then its name, author, version and status are displayed

  @variables
  Scenario: Display every supported prompt variable
    When the user opens Prompts
    Then supported variables include "{SOURCE_ASSET}"
    And supported variables include "{SOURCE_SCHEMA}"
    And supported variables include "{TARGET_SCHEMA}"
    And supported variables include "{EXAMPLES}"
    And supported variables include "{CONSTRAINTS}"

  @versioning
  Scenario: Create an immutable prompt version
    Given prompt version "1.0.0" exists
    When version "1.1.0" is saved
    Then both versions are listed
    And version "1.0.0" has not changed

  @lifecycle
  Scenario: Follow the supported prompt lifecycle
    Given a draft prompt version
    When its status changes to "Active"
    And later changes to "Deprecated"
    And later changes to "Archived"
    Then each transition is retained in the administrative audit log

  @dry-run
  Scenario: Dry-run a prompt with public sample data
    Given an active prompt and active LLM configuration
    And sample input:
      """
      {"id":"public-dataset-1","title":"Air quality observations"}
      """
    When the user runs a dry run
    Then a transformation result or explicit provider error is displayed
    And the UI does not remain indefinitely in a running state

  @test-case
  Scenario: Save and reload a prompt test case
    Given a prompt, version, LLM configuration and sample input are selected
    When the user saves test case "QA Public Prompt Case"
    And reloads that test case
    Then the saved selections and input are restored

