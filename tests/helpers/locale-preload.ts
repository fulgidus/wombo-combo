// Preloaded by bunfig.toml before every test file: tests assert English text,
// so neutralise the developer's locale environment. Tests that exercise
// detection pass an explicit env object or set WOMBO_LOCALE themselves.
process.env.WOMBO_LOCALE = "en";
delete process.env.WOMBO_I18N_DEBUG;
