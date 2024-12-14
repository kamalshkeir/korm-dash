window.onload = function() {
    // Begin Swagger UI call region
    const ui = SwaggerUIBundle({
      url: "./swagger.json",
      dom_id: '#docs-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "StandaloneLayout"
    });
    // End Swagger UI call region
};