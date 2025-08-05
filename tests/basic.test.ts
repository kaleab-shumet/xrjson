import { parseXrjson, XrjsonError } from '../src/index';

describe('xrjson parser', () => {
  test('parses unified format correctly', () => {
    const content = `{
      "language": "python",
      "code": "xrjson('test_function')"
    }
    
    <literals>
      <literal id="test_function">
def test():
    return "Hello World"
      </literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.language).toBe('python');
    expect(result.code).toBe('def test():\n    return "Hello World"');
  });

  test('parses separate format correctly', () => {
    const jsonText = '{"code": "xrjson(\\"func\\")"}';
    const xmlText = '<literals><literal id="func">console.log("test");</literal></literals>';

    const result = parseXrjson(jsonText, xmlText);
    
    expect(result.code).toBe('console.log("test");');
  });

  test('handles array references', () => {
    const content = `[
      {"lang": "js", "code": "xrjson('func1')"},
      {"lang": "py", "code": "xrjson('func2')"}
    ]
    
    <literals>
      <literal id="func1">console.log('JS');</literal>
      <literal id="func2">print('Python')</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].code).toBe("console.log('JS');");
    expect(result[1].code).toBe("print('Python')");
  });

  test('throws error for missing literal', () => {
    const content = `{
      "code": "xrjson('missing')"
    }
    
    <literals>
      <literal id="other">Some code</literal>
    </literals>`;

    expect(() => parseXrjson(content)).toThrow(XrjsonError);
    expect(() => parseXrjson(content)).toThrow('Literal with ID "missing" not found');
  });

  test('handles object-style references', () => {
    const content = `{
      "config": { "xrjson": "app_config" }
    }
    
    <literals>
      <literal id="app_config">{"debug": true}</literal>
    </literals>`;

    const result = parseXrjson(content);
    expect(result.config).toBe('{"debug": true}');
  });
});