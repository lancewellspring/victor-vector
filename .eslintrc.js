module.exports = {
  "rules": {
    "import/no-unresolved": "error",
    "import/no-useless-path-segments": "error", 
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='require']",
        "message": "Use ES module 'import' instead of CommonJS 'require'"
      }
    ]
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "settings": {
    "import/resolver": {
      "alias": {
        "map": [
          ["@shared", "./static/shared"]
        ],
        "extensions": [".js", ".json"]
      }
    }
  }
}