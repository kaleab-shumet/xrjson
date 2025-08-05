import { parseXrjson, XrjsonError } from '../src/index';

describe('xrjson raw JSON parsing', () => {
  test('parses simple JSON objects without literals', () => {
    const result = parseXrjson('{"name": "abe", "age": 30}');
    
    expect(result).toEqual({
      name: "abe",
      age: 30
    });
  });

  test('parses complex nested JSON structures', () => {
    const json = `{
      "user": {
        "id": 123,
        "profile": {
          "name": "John Doe",
          "email": "john@example.com",
          "preferences": {
            "theme": "dark",
            "notifications": true
          }
        },
        "roles": ["admin", "user"]
      },
      "metadata": {
        "created": "2024-01-01",
        "version": "1.0.0"
      }
    }`;
    
    const result = parseXrjson(json);
    
    expect(result.user.id).toBe(123);
    expect(result.user.profile.name).toBe("John Doe");
    expect(result.user.profile.preferences.theme).toBe("dark");
    expect(result.user.roles).toEqual(["admin", "user"]);
    expect(result.metadata.version).toBe("1.0.0");
  });

  test('parses JSON arrays', () => {
    const result = parseXrjson('[{"name": "alice"}, {"name": "bob"}, {"name": "charlie"}]');
    
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("alice");
    expect(result[1].name).toBe("bob");
    expect(result[2].name).toBe("charlie");
  });

  test('parses JSON with various data types', () => {
    const json = `{
      "string": "hello",
      "number": 42,
      "float": 3.14,
      "boolean_true": true,
      "boolean_false": false,
      "null_value": null,
      "array": [1, 2, 3],
      "empty_object": {},
      "empty_array": []
    }`;
    
    const result = parseXrjson(json);
    
    expect(result.string).toBe("hello");
    expect(result.number).toBe(42);
    expect(result.float).toBe(3.14);
    expect(result.boolean_true).toBe(true);
    expect(result.boolean_false).toBe(false);
    expect(result.null_value).toBeNull();
    expect(result.array).toEqual([1, 2, 3]);
    expect(result.empty_object).toEqual({});
    expect(result.empty_array).toEqual([]);
  });

  test('handles whitespace and formatting in raw JSON', () => {
    const json = `
    {
      "formatted": "properly",
      "with": {
        "nested": "values"
      }
    }
    `;
    
    const result = parseXrjson(json);
    
    expect(result.formatted).toBe("properly");
    expect(result.with.nested).toBe("values");
  });

  test('throws error for invalid JSON syntax', () => {
    expect(() => parseXrjson('{"invalid": json}')).toThrow(XrjsonError);
    expect(() => parseXrjson('{"missing": "quote}')).toThrow(XrjsonError);
    expect(() => parseXrjson('{trailing: comma,}')).toThrow(XrjsonError);
  });

  test('handles edge case JSON values', () => {
    // Empty object
    expect(parseXrjson('{}')).toEqual({});
    
    // Empty array
    expect(parseXrjson('[]')).toEqual([]);
    
    // Single string
    expect(parseXrjson('"hello world"')).toBe("hello world");
    
    // Single number
    expect(parseXrjson('42')).toBe(42);
    
    // Single boolean
    expect(parseXrjson('true')).toBe(true);
    
    // Single null
    expect(parseXrjson('null')).toBeNull();
  });

  test('distinguishes between raw JSON and xrjson format', () => {
    // Raw JSON - no processing
    const rawResult = parseXrjson('{"message": "xrjson will not process this"}');
    expect(rawResult.message).toBe("xrjson will not process this");
    
    // xrjson format - processes references
    const xrjsonResult = parseXrjson(`{
      "message": "xrjson('greeting')"
    }
    
    <literals>
      <literal id="greeting">Hello World</literal>
    </literals>`);
    expect(xrjsonResult.message).toBe("Hello World");
  });

  test('handles JSON with special characters and unicode', () => {
    const json = `{
      "special_chars": "!@#$%^&*()_+-=[]{}|;:'\\",./<>?",
      "unicode": "🚀 ñáéíóú 中文 العربية Ελληνικά русский",
      "escaped": "Line 1\\nLine 2\\tTabbed",
      "quotes": "He said \\"Hello\\" to me"
    }`;
    
    const result = parseXrjson(json);
    
    expect(result.special_chars).toBe("!@#$%^&*()_+-=[]{}|;:'\",./<>?");
    expect(result.unicode).toContain('🚀');
    expect(result.unicode).toContain('中文');
    expect(result.escaped).toContain('\n');
    expect(result.escaped).toContain('\t');
    expect(result.quotes).toBe('He said "Hello" to me');
  });

  test('maintains numeric precision for large numbers', () => {
    const json = `{
      "big_integer": 9007199254740991,
      "scientific": 1.23e-4,
      "negative": -42.5
    }`;
    
    const result = parseXrjson(json);
    
    expect(result.big_integer).toBe(9007199254740991);
    expect(result.scientific).toBe(0.000123);
    expect(result.negative).toBe(-42.5);
  });
});