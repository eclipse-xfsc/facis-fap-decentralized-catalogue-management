@bdd @llm @providers
Feature: LLM provider and model configuration
  AI transformations must use explicit provider and model configuration while keeping credentials secret.

  Background:
    Given an authenticated user with Schema Registry update access

  @provider
  Scenario: Add a provider without exposing its key
    Given provider name "QA OpenAI Provider"
    And provider type "openai"
    And endpoint "https://api.openai.com/v1/chat/completions"
    And a valid API key supplied from secure CI configuration
    When the provider is saved
    Then the provider table displays "Key set"
    And the API key value is not displayed

  @provider @connection
  Scenario: Test an active provider connection
    Given an active provider with a valid key
    When the user tests the provider connection
    Then the UI reports success or an actionable provider response
    And no key value appears in the message or audit log

  @provider @precedence
  Scenario: Set provider precedence and default
    Given two active providers exist
    When the user changes their precedence
    And sets one provider as default
    Then precedence 1 identifies the highest priority provider
    And exactly one provider is marked default

  @llm-config
  Scenario: Create an LLM configuration
    Given an active provider
    When the user creates configuration "QA Deterministic LLM"
    And sets model "gpt-4o-mini"
    And sets temperature 0
    And sets max tokens 1024
    And sets timeout 30 seconds
    Then the configuration is listed with the entered values

  @negative @security
  Scenario: Reject an unusable provider configuration safely
    Given a provider has an invalid endpoint or credential
    When the connection is tested
    Then an actionable error is displayed
    And no secret or authorization header is returned

