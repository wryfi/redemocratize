export default {
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
        htmlWhitespaceSensitivity: "ignore",
      },
    },
  ],
  printWidth: 100,
  semi: false,
  htmlWhitespaceSensitivity: "ignore",
}
