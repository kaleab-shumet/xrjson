# xrjson (Xml Referring JSON)

A TypeScript library for parsing JSON with external XML literal references, designed to solve JSON generation errors in Large Language Models by separating complex content from JSON structure.

## What is XRJSON?

An extended JSON format that references XML content by ID using `"xrjson('id')"` to avoid escaping issues and parsing problems. 

## Problem Statement

Large Language Models frequently produce malformed JSON when generating content that includes long code blocks, complex configurations, or multi-line text. Common issues include:

- Escaping errors with missing quotes, newlines, or other escape sequences
- Syntax conflicts between JSON structure and embedded code syntax
- Truncated generation due to token limits
- Context confusion when mixing JSON formatting rules with content formatting

## Solution

xrjson provides a reference-based approach that allows clean JSON structure with complex content stored separately:

```xrjson
{
  "language": "python",
  "functions": [
    "xrjson('hello_function')",
    "xrjson('math_function')"
  ]
}

<literals>
  <literal id="hello_function">
def hello(name):
    return f"Hello, {name}!"
  </literal>
  <literal id="math_function">
def calculate(a, b):
    return a + b
  </literal>
</literals>
```

## Installation

```bash
npm install xrjson
```

## XRJSON Format Rules and Guidelines

### Reference Styles

* **Recommended:** `"xrjson('id')"` 
* **Also allowed:** `"xrjson(\"id\")"` or `{ "xrjson": "id" }`

### Benefits

* Cleaner JSON and XML
* Prevents escaping errors for llms
* Easier to manage long content
* AI-friendly structure

## Usage

The library supports three parsing modes:

### 1. Unified Format (Recommended)

```typescript
import { parseXrjson } from 'xrjson';

// Parse content with markdown code block wrapper and inline references
const codeBlockContent = `\`\`\`xrjson
{
  "tutorial": "Here's how to create a Python function: xrjson('python_example')",
  "instructions": "First run xrjson('setup_cmd'), then execute xrjson('main_script')",
  "code": "xrjson('python_example')"
}

<literals>
<literal id="python_example">def greet(name):
    return f"Hello, {name}!"</literal>
<literal id="setup_cmd">pip install requirements</literal>
<literal id="main_script">python app.py</literal>
</literals>
\`\`\``;

const result = parseXrjson(codeBlockContent);
console.log(result);

/* Output:
{
  tutorial: "Here's how to create a Python function: def greet(name):\n    return f\"Hello, {name}!\"",
  instructions: "First run pip install requirements, then execute python app.py",
  code: "def greet(name):\n    return f\"Hello, {name}!\""
}
*/
```

### 2. Separate Format

```typescript
const jsonText = `{"code": "xrjson('func')"}`;
const xmlText = `<literals><literal id="func">console.log('Hello');</literal></literals>`;

const result = parseXrjson(jsonText, xmlText);
```

### 3. Raw JSON

```typescript
import { parseXrjson } from 'xrjson';

// Works as drop-in replacement for JSON.parse()
const result = parseXrjson('{"name": "John", "age": 30}');
console.log(result); // { name: "John", age: 30 }
```

### Rules for LLM Text Generation

* Use `xrjson code blocks` for XML references
* Long or multiline content (>50 chars) → use external literals
* No JavaScript in JSON (e.g., no `+`, functions, concatenation)
* Don't concatenate strings inside JSON
* Place all long text inside a literal
* Use inline references: `"Here is code: xrjson('code-id')"`

### Example Prompt Template

```
Generate xrjson format with the following guidelines:
- Wrap output in ```xrjson code blocks
- Use "xrjson('id')" for any content longer than 50 characters
- Put code, documentation, and long text in <literal> elements
- Keep JSON structure simple - no string concatenation
- Reference literals using xrjson('literal-id') with unique id
- Use inline references within strings for mixed content

Output format:
```xrjson
{
  "instructions": "First step: xrjson('setup') then xrjson('run')",
  "code": "xrjson('main-code')"
}

<literals>
<literal id="setup">pip install requirements</literal>
<literal id="run">python app.py</literal>
<literal id="main-code">def hello():
    print("Hello World!")</literal>
</literals>
```

This ensures clean generation and reduces JSON escaping errors.

## Benefits for LLMs

- **Reduced errors** - Eliminates JSON escaping mistakes
- **Faster generation** - Simpler structure requirements
- **Lower token costs** - Cleaner, more efficient context
- **Better focus** - Separates structure from content concerns
- **Reliable output** - Reduces truncation and malformed JSON
- **Copy-paste ready** - Generated code blocks work directly

## Example

See `example.xrjson` for a complete demonstration.

## API Reference

### `parseXrjson(content: string): any`

**Three parsing modes automatically detected:**

1. **Unified xrjson format:**
   ```typescript
   parseXrjson(`{"code": "xrjson('func')"}\n<literals>...</literals>`)
   ```

2. **Separate format:**
   ```typescript
   parseXrjson('{"code": "xrjson(\'func\')"}', '<literals>...</literals>')
   ```

3. **Raw JSON parsing:**
   ```typescript
   parseXrjson('{"name": "John"}') // Standard JSON
   ```


**Parameters:**
- `content`: JSON string (raw) or xrjson content with `<literals>` block
- `literalsXml` (optional): XML string for separate format

**Returns:** JavaScript object with all references resolved

**Throws:** `XrjsonError` for parsing errors or missing references

## License

MIT License
