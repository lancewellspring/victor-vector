module.exports = {
  "rules": {
    "import/no-unresolved": "error",
    "import/no-useless-path-segments": "error"
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