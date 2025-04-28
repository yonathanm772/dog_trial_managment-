module.exports = {
    apps: [
        {
            name: "dog-trials-backend",
            script: "server.js",
            watch: true, // Optional: Restart on file changes
        },
        {
            name: "dog-trials-electron",
            script: "node_modules/electron/dist/electron.exe",
            args: ".",
            cwd: "C:/Users/yonat/Desktop/2025 SP/CS 425/mongo trial", // Set the working directory
            interpreter: "none", // Prevent PM2 from using Node.js to interpret the script
            watch: false, // Electron doesn't need to watch files
        },
    ],
};