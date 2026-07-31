@bdd @catalogue-registry @registration
Feature: Remote catalogue registration and connection validation
  Users must be able to register supported public catalogue protocols without storing confidential test data.

  Background:
    Given an authenticated user with Catalogue Registry create access

  @query-interface @public-data
  Scenario: Register a public REST JSON catalogue
    Given catalogue ID "qa-public-posts"
    And catalogue name "QA Public Posts"
    And owner contact "qa@example.org"
    And query endpoint "https://jsonplaceholder.typicode.com/posts"
    And expected MIME type "application/json"
    And response asset ID field "id"
    And response asset name field "title"
    When the user tests the connection
    Then the connection is reported as a verified JSON result
    When the user registers the catalogue
    Then the catalogue is saved as active

  @ai-driven @public-data @regression
  Scenario: Register a public catalogue with AI-driven transformation
    Given a public REST JSON catalogue that passes connection testing
    And transformation strategy "AI-driven"
    And all required AI mapping references are selected
    When the user registers the catalogue
    Then the catalogue is saved
    And its transformation strategy is displayed as "AI-driven"
    And it is selectable in the Harvest Wizard

  @dcat @public-data
  Scenario: Register a public DCAT catalogue
    Given a public DCAT endpoint returning RDF
    And protocol "DCAT"
    And the expected RDF format is configured
    When the user tests and registers the catalogue
    Then its protocol is stored as "dcat"
    And the catalogue is eligible for harvesting

  @oai-pmh @public-data
  Scenario: Register a public OAI-PMH catalogue
    Given a public OAI-PMH base endpoint
    And protocol "OAI-PMH"
    And a supported metadata prefix
    When the user tests and registers the catalogue
    Then its OAI-PMH configuration is retained
    And the catalogue is eligible for harvesting

  @negative @validation
  Scenario: Required protocol fields prevent invalid registration
    Given the selected protocol requires a query endpoint
    And the query endpoint is empty
    When the user attempts to register the catalogue
    Then registration is disabled or rejected
    And the missing query endpoint is identified

  @authentication @security
  Scenario: Registration supports protected catalogues without exposing secrets
    Given authentication method "API Key" is selected
    When the registration form is displayed
    Then an API key input is available
    And any entered key is masked
    And saved catalogue lists never display the key value

