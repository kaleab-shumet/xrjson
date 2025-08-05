import { parseXrjson, XrjsonError } from '../src/index';

describe('xrjson complex scenarios', () => {
  test('handles deeply nested circular reference detection', () => {
    const content = `{
      "start": "xrjson('chain1')"
    }
    
    <literals>
      <literal id="chain1">Step 1: xrjson('chain2')</literal>
      <literal id="chain2">Step 2: xrjson('chain3')</literal>
      <literal id="chain3">Step 3: xrjson('chain1')</literal>
    </literals>`;

    expect(() => parseXrjson(content)).toThrow(XrjsonError);
    expect(() => parseXrjson(content)).toThrow('Circular reference detected for literal ID: chain1');
  });

  test('handles self-referencing literals', () => {
    const content = `{
      "recursive": "xrjson('self-ref')"
    }
    
    <literals>
      <literal id="self-ref">This refers to xrjson('self-ref')</literal>
    </literals>`;

    expect(() => parseXrjson(content)).toThrow(XrjsonError);
    expect(() => parseXrjson(content)).toThrow('Circular reference detected for literal ID: self-ref');
  });

  test('handles JSON with complex data structures and multiple format mixing', () => {
    const content = `{
      "api_response": {
        "status": 200,
        "data": [
          {
            "id": 1,
            "template": "xrjson('email-template')",
            "config": { "xrjson": "email-config" }
          },
          {
            "id": 2,
            "template": "xrjson(\\"sms-template\\")",
            "metadata": {
              "tags": ["urgent", "xrjson('priority-tag')"],
              "settings": { "xrjson": "sms-settings" }
            }
          }
        ],
        "pagination": {
          "page": 1,
          "total": "xrjson('total-count')",
          "links": {
            "next": "xrjson('next-url')",
            "prev": null
          }
        }
      }
    }
    
    <literals>
      <literal id="email-template">
        <html>
          <body>
            <h1>xrjson('email-subject')</h1>
            <p>Dear xrjson('recipient-name'),</p>
            <p>xrjson('email-body')</p>
          </body>
        </html>
      </literal>
      <literal id="email-config">{"from": "noreply@example.com", "priority": "high"}</literal>
      <literal id="sms-template">SMS: xrjson('sms-message')</literal>
      <literal id="priority-tag">high-priority</literal>
      <literal id="sms-settings">{"provider": "twilio", "retry": true}</literal>
      <literal id="total-count">42</literal>
      <literal id="next-url">/api/data?page=2</literal>
      <literal id="email-subject">Important Update</literal>
      <literal id="recipient-name">John Doe</literal>
      <literal id="email-body">Your account has been updated successfully.</literal>
      <literal id="sms-message">Your verification code is 123456</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.api_response.status).toBe(200);
    expect(result.api_response.data[0].template).toContain('Important Update');
    expect(result.api_response.data[0].template).toContain('John Doe');
    expect(result.api_response.data[0].template).toContain('Your account has been updated successfully.');
    expect(result.api_response.data[0].config).toBe('{"from": "noreply@example.com", "priority": "high"}');
    expect(result.api_response.data[1].template).toBe('SMS: Your verification code is 123456');
    expect(result.api_response.data[1].metadata.tags).toEqual(['urgent', 'high-priority']);
    expect(result.api_response.data[1].metadata.settings).toBe('{"provider": "twilio", "retry": true}');
    expect(result.api_response.pagination.total).toBe('42');
    expect(result.api_response.pagination.links.next).toBe('/api/data?page=2');
  });

  test('handles malformed XML gracefully', () => {
    const content = `{
      "data": "xrjson('test')"
    }
    
    <literals>
      <literal id="test">Unclosed tag <div>content</literal>
    </literals>`;

    const result = parseXrjson(content);
    expect(result.data).toBe('Unclosed tag <div>content');
  });

  test('handles empty and whitespace-only references', () => {
    const content = `{
      "empty": "xrjson('empty-content')",
      "whitespace": "xrjson('whitespace-content')",
      "mixed": "Before xrjson('empty-content') after xrjson('whitespace-content') end"
    }
    
    <literals>
      <literal id="empty-content"></literal>
      <literal id="whitespace-content">   
      </literal>
    </literals>`;

    const result = parseXrjson(content);
    expect(result.empty).toBe('');
    expect(result.whitespace).toBe('   \n      ');
    expect(result.mixed).toBe('Before  after    \n       end');
  });

  test('handles very large number of references', () => {
    let jsonContent = '{"items": [';
    let literalsContent = '<literals>';
    
    // Generate 100 references
    for (let i = 0; i < 100; i++) {
      if (i > 0) jsonContent += ', ';
      jsonContent += `"xrjson('item${i}')"`;
      literalsContent += `<literal id="item${i}">Content ${i}</literal>`;
    }
    
    jsonContent += ']}';
    literalsContent += '</literals>';
    
    const content = `${jsonContent}\n\n${literalsContent}`;
    
    const result = parseXrjson(content);
    expect(result.items).toHaveLength(100);
    expect(result.items[0]).toBe('Content 0');
    expect(result.items[50]).toBe('Content 50');
    expect(result.items[99]).toBe('Content 99');
  });

  test('handles mixed content with code blocks and templates', () => {
    const content = `{
      "documentation": {
        "react_component": "xrjson('react-docs')",
        "api_example": "xrjson('api-docs')",
        "config_file": "xrjson('config-docs')"
      }
    }
    
    <literals>
      <literal id="react-docs">
# React Component Usage

\`\`\`jsx
import React from 'react';

function MyComponent({ title = "xrjson('default-title')" }) {
  return (
    <div className="component">
      <h1>{title}</h1>
      <p>xrjson('component-description')</p>
    </div>
  );
}

export default MyComponent;
\`\`\`
      </literal>
      <literal id="api-docs">
# API Documentation

## POST /api/users

\`\`\`json
{
  "name": "xrjson('user-name')",
  "email": "xrjson('user-email')",
  "settings": {
    "theme": "xrjson('user-theme')",
    "notifications": true
  }
}
\`\`\`

Response: xrjson('api-response')
      </literal>
      <literal id="config-docs">
# Configuration

\`\`\`yaml
app:
  name: xrjson('app-name')
  version: xrjson('app-version')
  features:
    - authentication
    - xrjson('feature-name')
\`\`\`
      </literal>
      <literal id="default-title">Welcome</literal>
      <literal id="component-description">This is a reusable component</literal>
      <literal id="user-name">Alice Johnson</literal>
      <literal id="user-email">alice@example.com</literal>
      <literal id="user-theme">dark</literal>
      <literal id="api-response">{"id": 123, "status": "created"}</literal>
      <literal id="app-name">MyApp</literal>
      <literal id="app-version">1.0.0</literal>
      <literal id="feature-name">real-time-sync</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.documentation.react_component).toContain('Welcome');
    expect(result.documentation.react_component).toContain('This is a reusable component');
    expect(result.documentation.api_example).toContain('Alice Johnson');
    expect(result.documentation.api_example).toContain('alice@example.com');
    expect(result.documentation.api_example).toContain('dark');
    expect(result.documentation.api_example).toContain('{"id": 123, "status": "created"}');
    expect(result.documentation.config_file).toContain('MyApp');
    expect(result.documentation.config_file).toContain('1.0.0');
    expect(result.documentation.config_file).toContain('real-time-sync');
  });
});