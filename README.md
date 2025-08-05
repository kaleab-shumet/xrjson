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

### Rules

* Use `xrjson code blocks` for external references
* Long or multiline content (>50 chars) → use external literals
* No JavaScript in JSON (e.g., no `+`, functions)
* Don't concatenate strings inside JSON
* Place all text (even intro) inside a literal

### Reference Styles

* **Recommended:** `"xrjson('id')"` 
* **Also allowed:** `"xrjson(\"id\")"` or `{ "xrjson": "id" }`

### Benefits

* Cleaner JSON and XML
* Prevents escaping errors
* Easier to manage long content
* AI-friendly structure

## Usage

The library supports three parsing modes:

### 1. Unified Format (Recommended)

```typescript
import { parseXrjson } from 'xrjson';

const content = `{
  "language": "python", 
  "code": "xrjson('my_function')"
}

<literals>
  <literal id="my_function">
def hello_world():
    print("Hello, World!")
    return "success"
  </literal>
</literals>`;

const result = parseXrjson(content);
console.log(result);
// Output: { language: "python", code: "def hello_world():\n    print(\"Hello, World!\")\n    return \"success\"" }
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

## Complete Example

```xrjson
{
  "tools": [
    {
      "toolName": "new_file",
      "path": "/long_code.js", 
      "content": "xrjson('long_function')"
    }
  ]
}

<literals>
<literal id="long_function">
// Escaping is not needed. Automatically handled
const longFunction = () => {
    // Very long function
    console.log("No escaping required for quotes or special chars!");
}
</literal>
</literals>
```

## Benefits for LLMs

- Reduced errors through elimination of JSON escaping mistakes
- Faster generation with simpler structure requirements
- Lower token costs via cleaner, more efficient context
- Better focus by separating structure from content concerns

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
