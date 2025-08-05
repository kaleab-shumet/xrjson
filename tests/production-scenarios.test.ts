import { parseXrjson, XrjsonError } from '../src/index';

describe('xrjson production scenarios', () => {
  test('handles database migration scripts with SQL and metadata', () => {
    const content = `{
      "migrations": [
        {
          "version": "001",
          "name": "create_users_table",
          "up": "xrjson('create_users_up')",
          "down": "xrjson('create_users_down')",
          "metadata": { "xrjson": "migration_metadata" }
        },
        {
          "version": "002",
          "name": "add_indexes",
          "up": "xrjson('add_indexes_up')",
          "down": "xrjson('add_indexes_down')"
        }
      ]
    }
    
    <literals>
      <literal id="create_users_up">
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (username, email, password_hash) 
VALUES ('admin', 'xrjson("admin_email")', 'xrjson("admin_hash")');
      </literal>
      <literal id="create_users_down">
DROP TABLE IF EXISTS users;
      </literal>
      <literal id="migration_metadata">{"author": "xrjson('dev_name')", "ticket": "PROJ-123", "rollback_safe": true}</literal>
      <literal id="add_indexes_up">
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);
      </literal>
      <literal id="add_indexes_down">
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_email;
      </literal>
      <literal id="admin_email">admin@company.com</literal>
      <literal id="admin_hash">$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/</literal>
      <literal id="dev_name">Development Team</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.migrations).toHaveLength(2);
    expect(result.migrations[0].up).toContain('CREATE TABLE users');
    expect(result.migrations[0].up).toContain('admin@company.com');
    expect(result.migrations[0].up).toContain('$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/');
    expect(result.migrations[0].down.trim()).toBe('DROP TABLE IF EXISTS users;');
    expect(result.migrations[0].metadata).toContain('Development Team');
    expect(result.migrations[1].up).toContain('CREATE INDEX idx_users_email');
  });

  test('handles Kubernetes deployment manifests with environment-specific values', () => {
    const content = `{
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {
        "name": "xrjson('app-name')",
        "labels": { "xrjson": "common-labels" }
      },
      "spec": {
        "replicas": "xrjson('replica-count')",
        "selector": {
          "matchLabels": { "xrjson": "selector-labels" }
        },
        "template": {
          "metadata": {
            "labels": { "xrjson": "pod-labels" }
          },
          "spec": {
            "containers": [
              {
                "name": "xrjson('container-name')",
                "image": "xrjson('container-image')",
                "env": "xrjson('env-vars')",
                "resources": { "xrjson": "resource-limits" }
              }
            ]
          }
        }
      }
    }
    
    <literals>
      <literal id="app-name">my-web-app</literal>
      <literal id="common-labels">{"app": "my-web-app", "version": "xrjson('app-version')", "environment": "xrjson('deploy-env')"}</literal>
      <literal id="replica-count">3</literal>
      <literal id="selector-labels">{"app": "my-web-app"}</literal>
      <literal id="pod-labels">{"app": "my-web-app", "version": "xrjson('app-version')"}</literal>
      <literal id="container-name">web-server</literal>
      <literal id="container-image">nginx:xrjson('nginx-version')</literal>
      <literal id="env-vars">[
        {"name": "DATABASE_URL", "value": "xrjson('db-url')"},
        {"name": "REDIS_URL", "value": "xrjson('redis-url')"},
        {"name": "API_KEY", "valueFrom": {"secretKeyRef": {"name": "api-secrets", "key": "api-key"}}}
      ]</literal>
      <literal id="resource-limits">{"requests": {"memory": "64Mi", "cpu": "250m"}, "limits": {"memory": "128Mi", "cpu": "500m"}}</literal>
      <literal id="app-version">v1.2.3</literal>
      <literal id="deploy-env">production</literal>
      <literal id="nginx-version">1.21-alpine</literal>
      <literal id="db-url">postgresql://user:pass@db:5432/myapp</literal>
      <literal id="redis-url">redis://redis:6379/0</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.metadata.name).toBe('my-web-app');
    expect(result.metadata.labels).toContain('v1.2.3');
    expect(result.metadata.labels).toContain('production');
    expect(result.spec.replicas).toBe('3');
    expect(result.spec.template.spec.containers[0].name).toBe('web-server');
    expect(result.spec.template.spec.containers[0].image).toBe('nginx:1.21-alpine');
    expect(result.spec.template.spec.containers[0].env).toContain('postgresql://user:pass@db:5432/myapp');
    expect(result.spec.template.spec.containers[0].env).toContain('redis://redis:6379/0');
  });

  test('handles CI/CD pipeline configuration with dynamic stages', () => {
    const jsonText = `{
      "pipeline": {
        "stages": [
          {"name": "build", "script": "xrjson(\\"build_script\\")"},
          {"name": "test", "script": "xrjson(\\"test_script\\")"},
          {"name": "deploy", "script": "xrjson(\\"deploy_script\\")"}
        ],
        "variables": "xrjson(\\"pipeline_vars\\")"
      }
    }`;
    
    const xmlText = `<literals>
      <literal id="build_script">#!/bin/bash
set -e
echo "Building application..."
npm ci
npm run build
docker build -t $IMAGE_NAME:$BUILD_NUMBER .
echo "Build completed: xrjson('build_message')"</literal>
      <literal id="test_script">#!/bin/bash
set -e
echo "Running tests..."
npm test
npm run lint
npm run type-check
echo "xrjson('test_completion')"</literal>
      <literal id="deploy_script">#!/bin/bash
set -e
echo "Deploying to xrjson('target_env')..."
kubectl set image deployment/app container=xrjson('deploy_image')
kubectl rollout status deployment/app
echo "Deployment successful!"</literal>
      <literal id="pipeline_vars">{"NODE_ENV": "production", "DATABASE_URL": "xrjson('prod_db_url')", "API_TIMEOUT": "30000"}</literal>
      <literal id="build_message">Image ready for deployment</literal>
      <literal id="test_completion">All tests passed successfully</literal>
      <literal id="target_env">production</literal>
      <literal id="deploy_image">myapp:latest</literal>
      <literal id="prod_db_url">postgresql://prod-user:secure-pass@prod-db:5432/app</literal>
    </literals>`;

    const result = parseXrjson(jsonText, xmlText);
    
    expect(result.pipeline.stages).toHaveLength(3);
    expect(result.pipeline.stages[0].script).toContain('Image ready for deployment');
    expect(result.pipeline.stages[1].script).toContain('All tests passed successfully');
    expect(result.pipeline.stages[2].script).toContain('production');
    expect(result.pipeline.stages[2].script).toContain('myapp:latest');
    expect(result.pipeline.variables).toContain('postgresql://prod-user:secure-pass@prod-db:5432/app');
  });

  test('handles email template system with internationalization', () => {
    const content = `{
      "email_templates": {
        "welcome": {
          "subject": "xrjson('welcome_subject')",
          "html_body": "xrjson('welcome_html')",
          "text_body": "xrjson('welcome_text')"
        },
        "reset_password": {
          "subject": "xrjson('reset_subject')",
          "html_body": "xrjson('reset_html')",
          "text_body": "xrjson('reset_text')"
        }
      },
      "translations": { "xrjson": "i18n_data" }
    }
    
    <literals>
      <literal id="welcome_subject">Welcome to xrjson('company_name')! 🎉</literal>
      <literal id="welcome_html"><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>xrjson('welcome_subject')</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>xrjson('welcome_greeting')</h1>
    </div>
    <div class="content">
        <p>xrjson('welcome_message')</p>
        <p><a href="xrjson('activation_url')" class="button">xrjson('activate_button')</a></p>
        <p>xrjson('welcome_footer')</p>
    </div>
</body>
</html></literal>
      <literal id="welcome_text">xrjson('welcome_greeting')

xrjson('welcome_message')

Activate your account: xrjson('activation_url')

xrjson('welcome_footer')</literal>
      <literal id="reset_subject">Password Reset for xrjson('company_name')</literal>
      <literal id="reset_html"><!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
    <h2>xrjson('reset_greeting')</h2>
    <p>xrjson('reset_message')</p>
    <p><strong>xrjson('reset_code_label'):</strong> <code>xrjson('reset_code')</code></p>
    <p><a href="xrjson('reset_url')">xrjson('reset_link_text')</a></p>
    <p><small>xrjson('reset_expiry')</small></p>
</body>
</html></literal>
      <literal id="reset_text">xrjson('reset_greeting')

xrjson('reset_message')

xrjson('reset_code_label'): xrjson('reset_code')

Reset link: xrjson('reset_url')

xrjson('reset_expiry')</literal>
      <literal id="i18n_data">{"en": {"company_name": "TechCorp", "welcome_greeting": "Welcome!"}, "es": {"company_name": "TechCorp", "welcome_greeting": "¡Bienvenido!"}, "fr": {"company_name": "TechCorp", "welcome_greeting": "Bienvenue!"}}</literal>
      <literal id="company_name">TechCorp</literal>
      <literal id="welcome_greeting">Welcome to our platform!</literal>
      <literal id="welcome_message">Thank you for joining us. We're excited to have you on board.</literal>
      <literal id="activation_url">https://app.techcorp.com/activate?token=abc123</literal>
      <literal id="activate_button">Activate Account</literal>
      <literal id="welcome_footer">If you have any questions, contact us at support@techcorp.com</literal>
      <literal id="reset_greeting">Password Reset Request</literal>
      <literal id="reset_message">We received a request to reset your password.</literal>
      <literal id="reset_code_label">Reset Code</literal>
      <literal id="reset_code">987654</literal>
      <literal id="reset_url">https://app.techcorp.com/reset?code=987654</literal>
      <literal id="reset_link_text">Click here to reset your password</literal>
      <literal id="reset_expiry">This code expires in 15 minutes.</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.email_templates.welcome.subject).toBe('Welcome to TechCorp! 🎉');
    expect(result.email_templates.welcome.html_body).toContain('Welcome to our platform!');
    expect(result.email_templates.welcome.html_body).toContain('https://app.techcorp.com/activate?token=abc123');
    expect(result.email_templates.welcome.html_body).toContain('Activate Account');
    expect(result.email_templates.reset_password.subject).toBe('Password Reset for TechCorp');
    expect(result.email_templates.reset_password.html_body).toContain('987654');
    expect(result.email_templates.reset_password.text_body).toContain('This code expires in 15 minutes.');
    expect(result.translations).toContain('¡Bienvenido!');
    expect(result.translations).toContain('Bienvenue!');
  });

  test('handles configuration management with environment overrides', () => {
    const content = `{
      "application": {
        "name": "xrjson('app_name')",
        "version": "xrjson('app_version')",
        "environment": "xrjson('env_name')"
      },
      "database": { "xrjson": "db_config" },
      "cache": { "xrjson": "cache_config" },
      "logging": { "xrjson": "log_config" },
      "features": { "xrjson": "feature_flags" },
      "monitoring": { "xrjson": "monitoring_config" }
    }
    
    <literals>
      <literal id="app_name">MyProductionApp</literal>
      <literal id="app_version">2.1.0</literal>
      <literal id="env_name">production</literal>
      <literal id="db_config">{
        "host": "xrjson('db_host')",
        "port": 5432,
        "database": "xrjson('db_name')",
        "username": "xrjson('db_user')",
        "password": "xrjson('db_password')",
        "pool": {
          "min": 5,
          "max": 20,
          "idle_timeout": 10000
        },
        "ssl": true,
        "migrations": {
          "directory": "./migrations",
          "auto_run": false
        }
      }</literal>
      <literal id="cache_config">{
        "provider": "redis",
        "host": "xrjson('redis_host')",
        "port": 6379,
        "password": "xrjson('redis_password')",
        "db": 0,
        "ttl": 3600,
        "cluster_mode": true,
        "retry_strategy": {
          "max_attempts": 3,
          "delay": 1000
        }
      }</literal>
      <literal id="log_config">{
        "level": "xrjson('log_level')",
        "format": "json",
        "outputs": [
          {"type": "console"},
          {"type": "file", "path": "xrjson('log_file_path')"},
          {"type": "syslog", "facility": "local0"}
        ],
        "fields": {
          "service": "xrjson('app_name')",
          "version": "xrjson('app_version')",
          "environment": "xrjson('env_name')"
        }
      }</literal>
      <literal id="feature_flags">{
        "new_ui": xrjson('feature_new_ui'),
        "advanced_analytics": xrjson('feature_analytics'),
        "beta_features": xrjson('feature_beta'),
        "maintenance_mode": false,
        "rate_limiting": {
          "enabled": true,
          "requests_per_minute": xrjson('rate_limit')
        }
      }</literal>
      <literal id="monitoring_config">{
        "metrics": {
          "enabled": true,
          "endpoint": "xrjson('metrics_endpoint')",
          "interval": 30
        },
        "tracing": {
          "enabled": true,
          "service_name": "xrjson('app_name')",
          "jaeger_endpoint": "xrjson('jaeger_url')"
        },
        "health_checks": [
          {"name": "database", "url": "xrjson('health_db_url')"},
          {"name": "cache", "url": "xrjson('health_cache_url')"}
        ]
      }</literal>
      <literal id="db_host">prod-db-cluster.company.com</literal>
      <literal id="db_name">myapp_production</literal>
      <literal id="db_user">app_user</literal>
      <literal id="db_password">super_secure_prod_password_2024</literal>
      <literal id="redis_host">prod-cache-cluster.company.com</literal>
      <literal id="redis_password">redis_secure_password_2024</literal>
      <literal id="log_level">info</literal>
      <literal id="log_file_path">/var/log/myapp/application.log</literal>
      <literal id="feature_new_ui">true</literal>
      <literal id="feature_analytics">true</literal>
      <literal id="feature_beta">false</literal>
      <literal id="rate_limit">1000</literal>
      <literal id="metrics_endpoint">http://prometheus:9090/metrics</literal>
      <literal id="jaeger_url">http://jaeger:14268/api/traces</literal>
      <literal id="health_db_url">http://localhost:8080/health/db</literal>
      <literal id="health_cache_url">http://localhost:8080/health/cache</literal>
    </literals>`;

    const result = parseXrjson(content);
    
    expect(result.application.name).toBe('MyProductionApp');
    expect(result.application.version).toBe('2.1.0');
    expect(result.application.environment).toBe('production');
    
    const dbConfig = JSON.parse(result.database);
    expect(dbConfig.host).toBe('prod-db-cluster.company.com');
    expect(dbConfig.database).toBe('myapp_production');
    expect(dbConfig.password).toBe('super_secure_prod_password_2024');
    
    const cacheConfig = JSON.parse(result.cache);
    expect(cacheConfig.host).toBe('prod-cache-cluster.company.com');
    expect(cacheConfig.password).toBe('redis_secure_password_2024');
    
    const featureFlags = JSON.parse(result.features);
    expect(featureFlags.new_ui).toBe(true);
    expect(featureFlags.beta_features).toBe(false);
    expect(featureFlags.rate_limiting.requests_per_minute).toBe(1000);
  });
});