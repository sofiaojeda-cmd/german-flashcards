import * as React from "react";

/**
 * Returns the user's current level (1–15) from IndexedDB.
 * Starts at 1 and updates once the DB read resolves.
 * Use this to drive character-level-{N} sprite selection.
 */
export function useUserLevel(): number {
  const [level, setLevel] = React.useState(1);

  React.useEffect(() => {
    import("@/lib/db/schema").then(({ default: db }) =>
      db.progress.get("user")
    ).then((progress) => {
      if (progress?.level) setLevel(Math.min(progress.level, 15));
    });
  }, []);

  return level;
}
