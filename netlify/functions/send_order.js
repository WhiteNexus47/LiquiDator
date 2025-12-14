const { spawn } = require("child_process");
const path = require("path");

exports.handler = async function (event, context) {
  const pythonExe =
    process.env.PYTHON_EXECUTABLE ||
    "C:\\Users\\96IN\\ShopApp\\.venv\\Scripts\\python.exe";
  const scriptPath = path.join(process.cwd(), "scripts", "send_order_cli.py");

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExe, [scriptPath], { env: process.env });

    let out = "";
    let err = "";

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));

    child.on("close", (code) => {
      if (err) console.error("send_order shim stderr:", err);
      try {
        const parsed = JSON.parse(out);
        resolve(parsed);
      } catch (e) {
        reject(
          new Error(
            "Failed to parse send_order_cli output: " +
              e.message +
              "\n" +
              err +
              "\n" +
              out
          )
        );
      }
    });

    // send the event body into the python CLI
    child.stdin.write(event.body || "{}");
    child.stdin.end();
  });
};
