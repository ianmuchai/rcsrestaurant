const runtimeWindow = typeof window !== "undefined" ? window : {};

const ENV = {
    API_URL: runtimeWindow.APP_URL || process.env.MIX_HOST,
    API_KEY: runtimeWindow.APP_KEY || process.env.MIX_API_KEY,
    GOOGLE_MAP_KEY: runtimeWindow.GOOGLE_TOKEN || process.env.MIX_GOOGLE_MAP_KEY,
    DEMO: runtimeWindow.APP_DEMO || process.env.MIX_DEMO
};
export default ENV;
