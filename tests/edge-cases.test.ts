import { parseXrjson, XrjsonError } from '../src/index';

describe('xrjson edge cases', () => {
  test('handles deeply nested XML content with multiple references', () => {
    const content = `{
      "page": "xrjson('complex-page')"
    }
    
    <literals>
      <literal id="complex-page"><!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>xrjson('page-title')</title>
    <style>
      body { background: xrjson('bg-color'); }
    </style>
  </head>
  <body>
    <header>
      <h1>xrjson('main-title')</h1>
      <nav>
        <ul>
          <li><a href="/home">xrjson('nav-home')</a></li>
          <li><a href="/about">xrjson('nav-about')</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <article>
        <h2>xrjson('article-title')</h2>
        <p>xrjson('article-content')</p>
      </article>
    </main>
  </body>
</html></literal>
      <literal id="page-title">Advanced xrjson Test</literal>
      <literal id="bg-color">#f0f0f0</literal>
      <literal id="main-title">Welcome to xrjson</literal>
      <literal id="nav-home">Home</literal>
      <literal id="nav-about">About</literal>
      <literal id="article-title">Complex Content Test</literal>
      <literal id="article-content">This tests deeply nested HTML with multiple xrjson references.</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.page).toContain('Advanced xrjson Test');
    expect(result.page).toContain('#f0f0f0');
    expect(result.page).toContain('Welcome to xrjson');
    expect(result.page).toContain('Home');
    expect(result.page).toContain('About');
    expect(result.page).toContain('Complex Content Test');
    expect(result.page).toContain('This tests deeply nested HTML with multiple xrjson references.');
  });

  test('handles mixed quote types in same content', () => {
    const content = `{
      "mixed": "xrjson('single') and xrjson(\\"double\\")"
    }
    
    <literals>
      <literal id="single">Single quote ref</literal>
      <literal id="double">Double quote ref</literal>
    </literals>`;

    const result = parseXrjson(content);
    expect(result.mixed).toBe('Single quote ref and Double quote ref');
  });

  test('handles code with special characters (raw content)', () => {
    const content = `{
      "script": "xrjson('js-code')"
    }
    
    <literals>
      <literal id="js-code">
function test() {
  console.log("Hello <world>");
  return x < 5 && y > 10;
}
      </literal>
    </literals>`;

    const result = parseXrjson(content);
    expect(result.script).toContain('function test()');
    expect(result.script).toContain('console.log("Hello <world>");');
    expect(result.script).toContain('x < 5 && y > 10');
  });

  test('handles empty arrays and objects with references', () => {
    const content = `{
      "empty_array": [],
      "array_with_refs": [
        "xrjson('item1')",
        { "xrjson": "item2" },
        "xrjson('item3')"
      ],
      "nested_object": {
        "level1": {
          "level2": {
            "content": "xrjson('deep-content')"
          }
        }
      }
    }
    
    <literals>
      <literal id="item1">First item</literal>
      <literal id="item2">Second item</literal>
      <literal id="item3">Third item</literal>
      <literal id="deep-content">Deep nested content</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(Array.isArray(result.empty_array)).toBe(true);
    expect(result.empty_array.length).toBe(0);
    expect(result.array_with_refs).toEqual(['First item', 'Second item', 'Third item']);
    expect(result.nested_object.level1.level2.content).toBe('Deep nested content');
  });

  test('handles special characters and unicode in literals', () => {
    const content = `{
      "special": "xrjson('special-chars')",
      "unicode": "xrjson('unicode-text')"
    }
    
    <literals>
      <literal id="special-chars">Special: <>&"'@#$%^&*()</literal>
      <literal id="unicode-text">Unicode: 🚀 ñáéíóú 中文 العربية</literal>
    </literals>`;

    const result = parseXrjson(content);
    expect(result.special).toContain('<>&');
    expect(result.special).toContain('"\'@#$%^&*()');
    expect(result.unicode).toContain('🚀');
    expect(result.unicode).toContain('ñáéíóú');
    expect(result.unicode).toContain('中文');
    expect(result.unicode).toContain('العربية');
  });

  test('handles problematic strings that could break parsing', () => {
    const content = `{
      "sql_injection": "xrjson('sql-attack')",
      "path_traversal": "xrjson('path-attack')",
      "nested_quotes": "xrjson('quote-hell')",
      "control_chars": "xrjson('control-sequence')",
      "regex_bomb": "xrjson('regex-attack')",
      "unicode_exploit": "xrjson('unicode-attack')",
      "backslashes": "xrjson('backslash-test')",
      "json_structure": "xrjson('json-like')"
    }
    
    <literals>
      <literal id="sql-attack">'; DROP TABLE users; --</literal>
      <literal id="path-attack">../../../etc/passwd</literal>
      <literal id="quote-hell">"He said "She said 'It's "complicated"'"</literal>
      <literal id="control-sequence">Line1
Line2	Tabbed</literal>
      <literal id="regex-attack">^(a+)+$</literal>
      <literal id="unicode-attack">𝕏𝓇𝒿𝓈𝑜𝓃 ＜script＞alert()＜/script＞</literal>
      <literal id="backslash-test">C:\\Users\\John\\Documents\\file.txt</literal>
      <literal id="json-like">{"key": "value", "number": 123, "nested": {"inner": "data"}}</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    // Verify problematic content is preserved as plain text
    expect(result.sql_injection).toBe("'; DROP TABLE users; --");
    expect(result.path_traversal).toBe("../../../etc/passwd");
    expect(result.nested_quotes).toBe('"He said "She said \'It\'s "complicated"\'"');
    expect(result.control_chars).toContain("Line1\nLine2\tTabbed");
    expect(result.regex_bomb).toBe("^(a+)+$");
    expect(result.unicode_exploit).toBe("𝕏𝓇𝒿𝓈𝑜𝓃 ＜script＞alert()＜/script＞");
    expect(result.backslashes).toBe("C:\\Users\\John\\Documents\\file.txt");
    expect(result.json_structure).toBe('{"key": "value", "number": 123, "nested": {"inner": "data"}}');
    
    // Verify the main JSON structure wasn't broken
    expect(typeof result).toBe('object');
    expect(Object.keys(result)).toHaveLength(8);
  });

  test('handles special characters as raw text (no HTML entities)', () => {
    const content = `{
      "raw_content": "xrjson('raw-test')",
      "special_chars": "xrjson('special-test')"
    }
    
    <literals>
      <literal id="raw-test">Alert: <script>alert("test")</script></literal>
      <literal id="special-test">Text with & symbols < and > brackets</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    // All content is treated as raw - no entity processing
    expect(result.raw_content).toBe('Alert: <script>alert("test")</script>');
    expect(result.special_chars).toBe('Text with & symbols < and > brackets');
  });

  test('handles complex JSON with nested quotes and JavaScript with backticks', () => {
    const content = `{
      "simple_json": "xrjson('simple-json')",
      "js_with_backticks": "xrjson('js-template')",
      "mixed_quotes": "xrjson('quote-mix')",
      "backslash_heavy": "xrjson('backslash-code')"
    }
    
    <literals>
      <literal id="simple-json">{"name": "John", "role": "developer"}</literal>
      <literal id="js-template">const msg = \`Hello \${name}! Your score: \${score}\`;
console.log(\`Template with backticks\`);</literal>
      <literal id="quote-mix">"He said 'I love mixing quotes'"</literal>
      <literal id="backslash-code">const path = "C:\\Users\\John\\file.txt";
const regex = "\\w+\\d+";</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    // Verify simple JSON is preserved
    expect(result.simple_json).toBe('{"name": "John", "role": "developer"}');
    
    // Verify JavaScript with template literals
    expect(result.js_with_backticks).toContain('const msg = `Hello ${name}! Your score: ${score}`;');
    expect(result.js_with_backticks).toContain('console.log(`Template with backticks`);');
    
    // Verify mixed quotes work
    expect(result.mixed_quotes).toBe('"He said \'I love mixing quotes\'"');
    
    // Verify backslash handling
    expect(result.backslash_heavy).toContain('const path = "C:\\Users\\John\\file.txt";');
    expect(result.backslash_heavy).toContain('const regex = "\\w+\\d+";');
  });

  test('handles extremely complex quote and backtick combinations', () => {
    const content = `{
      "nested_json_hell": "xrjson('json-nightmare')",
      "js_template_chaos": "xrjson('template-chaos')",
      "quote_inception": "xrjson('quote-madness')",
      "mixed_syntax_bomb": "xrjson('syntax-bomb')"
    }
    
    <literals>
      <literal id="json-nightmare">{
  "user": {
    "name": "John \\"The Coder\\" O'Reilly",
    "bio": "He said: \\"I love 'complex' JSON with nested quotes!\\"",
    "config": {
      "quotes": "\\"single\\" and 'double' and backtick mixed",
      "template": "Template inside JSON with variables"
    }
  }
}</literal>
      <literal id="template-chaos">const template = \`Hello \${name}! Your message: "\${message}"\`;
const nested = \`Item: \${item.name} (\${item.value})\`;
const query = \`SELECT * FROM users WHERE name = '\${username}'\`;</literal>
      <literal id="quote-madness">"He said: \\"She replied: 'I told him: it\\'s complicated but he said trust me.'\\"</literal>
      <literal id="syntax-bomb">const mixed = {
  "json": '{"key": "value with quotes and backticks"}',
  'single': \`Template with "double" and 'single' quotes\`,
  regex: /(['"])(.*?)\\1/g
};</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    // Verify complex JSON with multiple quote types
    const jsonData = JSON.parse(result.nested_json_hell);
    expect(jsonData.user.name).toBe('John "The Coder" O\'Reilly');
    expect(jsonData.user.bio).toContain('I love \'complex\' JSON');
    expect(jsonData.user.config.quotes).toContain('"single" and \'double\'');
    
    // Verify complex JavaScript template literals
    expect(result.js_template_chaos).toContain('Hello ${name}!');
    expect(result.js_template_chaos).toContain('Your message: "${message}"');
    expect(result.js_template_chaos).toContain('Item: ${item.name} (${item.value})');
    expect(result.js_template_chaos).toContain('WHERE name = \'${username}\'');
    
    // Verify nested quote madness
    expect(result.quote_inception).toBe('"He said: \\"She replied: \'I told him: it\\\'s complicated but he said trust me.\'\\"');
    
    // Verify mixed syntax combinations
    expect(result.mixed_syntax_bomb).toContain('"json": \'{"key": "value with quotes and backticks"}\'');
    expect(result.mixed_syntax_bomb).toContain('\'single\': `Template with "double" and \'single\' quotes`');
    expect(result.mixed_syntax_bomb).toContain('regex: /([\'"])(.*?)\\1/g');
    
    // Verify the main JSON structure wasn't broken by all this complexity
    expect(typeof result).toBe('object');
    expect(Object.keys(result)).toHaveLength(4);
  });
});