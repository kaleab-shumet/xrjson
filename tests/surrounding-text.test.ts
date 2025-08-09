import { parseXrjson } from '../src/index';

describe('xrjson with surrounding text', () => {
  test('handles text before xrjson block', () => {
    const content = `Here is some explanation text before the xrjson block.
This should be ignored by the parser.

{
  "message": "Hello World",
  "status": "success"
}
<literals>
</literals>`;

    const result = parseXrjson(content);
    expect(result.message).toBe('Hello World');
    expect(result.status).toBe('success');
  });

  test('handles text after xrjson block', () => {
    const content = `{
  "data": "test content",
  "count": 42
}
<literals>
</literals>

This text comes after the xrjson block and should be ignored.
Additional lines of text here.`;

    const result = parseXrjson(content);
    expect(result.data).toBe('test content');
    expect(result.count).toBe(42);
  });

  test('handles text both before and after xrjson block', () => {
    const content = `# Documentation Header

This is some documentation that explains what this xrjson does.

{
  "tools": [
    {
      "toolName": "example_tool",
      "value": "example value"
    }
  ],
  "metadata": {
    "version": "1.0.0"
  }
}
<literals>
</literals>

## Footer

Additional documentation or notes can go here.
This will all be ignored by the parser.`;

    const result = parseXrjson(content);
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].toolName).toBe('example_tool');
    expect(result.metadata.version).toBe('1.0.0');
  });

  test('handles complex case with references and surrounding text', () => {
    const content = `<!-- This is a comment explaining the xrjson structure -->

Configuration for the AI agent workflow:

{
  "response": "xrjson('greeting')",
  "config": {
    "enabled": true,
    "timeout": 5000
  }
}
<literals>
  <literal id="greeting">Hello! I'm ready to help you with your tasks. How can I assist you today?</literal>
</literals>

<!-- End of configuration -->
Note: This configuration enables the greeting functionality.`;

    const result = parseXrjson(content);
    expect(result.response).toBe("Hello! I'm ready to help you with your tasks. How can I assist you today?");
    expect(result.config.enabled).toBe(true);
    expect(result.config.timeout).toBe(5000);
  });

  test('handles markdown code block format', () => {
    const content = `\`\`\`xrjson
{
  "message": "This is inside a markdown code block",
  "type": "markdown"
}
<literals>
</literals>
\`\`\``;

    const result = parseXrjson(content);
    expect(result.message).toBe('This is inside a markdown code block');
    expect(result.type).toBe('markdown');
  });

  test('finds JSON even when preceded by similar structures', () => {
    const content = `This document contains some JSON-like text: {"fake": "data"}

But the real xrjson structure is:

{
  "real": "data",
  "number": 123
}
<literals>
</literals>`;

    const result = parseXrjson(content);
    expect(result.real).toBe('data');
    expect(result.number).toBe(123);
    expect(result.fake).toBeUndefined();
  });
});