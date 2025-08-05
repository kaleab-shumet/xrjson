import { parseXrjson, XrjsonError } from '../src/index';

describe('xrjson advanced features', () => {
  test('handles nested references correctly', () => {
    const content = `{
      "template": "xrjson('html-template')"
    }
    
    <literals>
      <literal id="html-template">
<html>
  <head>
    <title>xrjson('page-title')</title>
  </head>
  <body>
    <h1>xrjson('header-text')</h1>
  </body>
</html>
      </literal>
      <literal id="page-title">My Application</literal>
      <literal id="header-text">Welcome to xrjson</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.template).toContain('<title>My Application</title>');
    expect(result.template).toContain('<h1>Welcome to xrjson</h1>');
  });

  test('handles mixed inline references', () => {
    const content = `{
      "message": "Available functions: xrjson('func1') and xrjson(\\"func2\\")"
    }
    
    <literals>
      <literal id="func1">add()</literal>
      <literal id="func2">subtract()</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.message).toBe('Available functions: add() and subtract()');
  });

  test('handles all three reference formats in single document', () => {
    const content = `{
      "methods": {
        "get": "xrjson('http-get')",
        "post": "xrjson(\\"http-post\\")",
        "put": { "xrjson": "http-put" }
      }
    }
    
    <literals>
      <literal id="http-get">GET /api/users</literal>
      <literal id="http-post">POST /api/users</literal>
      <literal id="http-put">PUT /api/users/:id</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.methods.get).toBe('GET /api/users');
    expect(result.methods.post).toBe('POST /api/users');
    expect(result.methods.put).toBe('PUT /api/users/:id');
  });

  test('handles complex nested objects and arrays', () => {
    const content = `{
      "services": [
        {
          "name": "auth",
          "code": "xrjson('auth-service')",
          "tests": ["xrjson('auth-test-1')", "xrjson('auth-test-2')"]
        },
        {
          "name": "database",
          "schema": { "xrjson": "db-schema" }
        }
      ]
    }
    
    <literals>
      <literal id="auth-service">
class AuthService {
  authenticate(token) {
    return jwt.verify(token, SECRET);
  }
}
      </literal>
      <literal id="auth-test-1">test('should authenticate valid token', () => {})</literal>
      <literal id="auth-test-2">test('should reject invalid token', () => {})</literal>
      <literal id="db-schema">
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE
);
      </literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.services).toHaveLength(2);
    expect(result.services[0].name).toBe('auth');
    expect(result.services[0].code).toContain('class AuthService');
    expect(result.services[0].tests).toHaveLength(2);
    expect(result.services[0].tests[0]).toContain('authenticate valid token');
    expect(result.services[1].schema).toContain('CREATE TABLE users');
  });

  test('detects circular references', () => {
    const content = `{
      "circular": "xrjson('ref1')"
    }
    
    <literals>
      <literal id="ref1">xrjson('ref2')</literal>
      <literal id="ref2">xrjson('ref1')</literal>
    </literals>`;

    expect(() => parseXrjson(content)).toThrow(XrjsonError);
    expect(() => parseXrjson(content)).toThrow('Circular reference detected');
  });

  test('handles empty literals gracefully', () => {
    const content = `{
      "empty": "xrjson('empty-literal')",
      "whitespace": "xrjson('whitespace-literal')"
    }
    
    <literals>
      <literal id="empty-literal"></literal>
      <literal id="whitespace-literal">   </literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.empty).toBe('');
    expect(result.whitespace).toBe('   ');
  });

  test('preserves literal content formatting', () => {
    const content = `{
      "code": "xrjson('formatted-code')"
    }
    
    <literals>
      <literal id="formatted-code">
function example() {
    if (true) {
        console.log("indented");
    }
    
    return {
        key: "value",
        nested: {
            data: true
        }
    };
}
      </literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.code).toContain('    if (true) {');
    expect(result.code).toContain('        console.log("indented");');
    expect(result.code).toContain('    }');
    expect(result.code).toContain('    \n    return {');
  });

  test('handles XML special characters in literals', () => {
    const content = `{
      "html": "xrjson('html-content')"
    }
    
    <literals>
      <literal id="html-content">&lt;div&gt;Content &amp; more&lt;/div&gt;</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.html).toBe('<div>Content & more</div>');
  });
});