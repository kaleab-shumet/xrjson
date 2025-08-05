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

  test('handles XML with CDATA sections', () => {
    const content = `{
      "script": "xrjson('js-code')"
    }
    
    <literals>
      <literal id="js-code"><![CDATA[
function test() {
  console.log("Hello <world>");
  return x < 5 && y > 10;
}
      ]]></literal>
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
      <literal id="special-chars">Special: &lt;&gt;&amp;"'@#$%^&*()</literal>
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
});