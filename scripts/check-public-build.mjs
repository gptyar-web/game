import { readdir, readFile } from "node:fs/promises";
async function scan(dir) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${f.name}`;
    if (f.isDirectory()) await scan(path);
    else if (/\.(js|html|css|json)$/.test(f.name)) {
      const text = await readFile(path, "utf8");
      if (
        /sb_secret_[A-Za-z0-9_-]{8,}/.test(text) ||
        (/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g.test(text) &&
          [
            ...text.matchAll(
              /eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g,
            ),
          ].some((m) => {
            try {
              return (
                JSON.parse(Buffer.from(m[1], "base64url").toString()).role ===
                "service_role"
              );
            } catch {
              return false;
            }
          }))
      )
        throw new Error(`Secret key detected in ${path}`);
    }
  }
}
await scan("dist");
console.log("Public build secret scan passed.");
