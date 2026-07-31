# Public and synthetic test data

The feature files intentionally contain no passwords, API keys, personal addresses or private service endpoints.

Safe examples used by the suite:

- Reserved email domain: `example.org`
- Synthetic IDs and names prefixed with `qa-` or `QA`
- Public REST example: `https://jsonplaceholder.typicode.com/posts`
- Public OpenAI API route documentation example: `https://api.openai.com/v1/chat/completions`
- Public sample assets such as `Q42` and `public-dataset-1`

Provider secrets must come from CI secret storage. They must never be written into a `.feature` file, source file, log, screenshot or workflow artifact.

