export function isConfigured(){return !!(process.env.MONGODB_URI&&process.env.BETTER_AUTH_SECRET&&process.env.BETTER_AUTH_URL)}
