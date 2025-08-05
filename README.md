# xrjson

A TypeScript library for parsing JSON with external XML literal references, designed to solve JSON generation errors in Large Language Models by separating complex content from JSON structure.

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

## Usage

### Unified Format (Recommended)

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

### Separate Format

```typescript
const jsonText = `{"code": "xrjson('func')"}`;
const xmlText = `<literals><literal id="func">console.log('Hello');</literal></literals>`;

const result = parseXrjson(jsonText, xmlText);
```

## Reference Formats

The library supports three ways to reference external literals:

1. Double quotes: `"xrjson(\"literal-id\")"`
2. Single quotes: `"xrjson('literal-id')"` 
3. Object style: `{ "xrjson": "literal-id" }`

## Benefits for LLMs

- Reduced errors through elimination of JSON escaping mistakes
- Faster generation with simpler structure requirements
- Lower token costs via cleaner, more efficient context
- Better focus by separating structure from content concerns

## Example

See `example.xrjson` for a complete demonstration.

## API Reference

### `parseXrjson(content: string): any`
Parses unified xrjson format (recommended).

**Parameters:**
- `content`: String containing JSON structure followed by `<literals>` block

**Returns:** JavaScript object with all references resolved

### `parseXrjson(jsonText: string, literalsXml: string): any`  
Parses separate format.

**Parameters:**
- `jsonText`: JSON string containing xrjson references
- `literalsXml`: XML string containing literal definitions

**Returns:** JavaScript object with all references resolved

Both methods throw `XrjsonError` for parsing errors or missing references.

## License

MIT License