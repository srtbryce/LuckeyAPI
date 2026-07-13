import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

const cache = new Map();
const CACHE_TIME_MS = 60_000;

app.get("/roblox/users/search", async (req, res) => {
  const keyword = String(req.query.keyword || "").trim();

  if (keyword.length < 2 || keyword.length > 50) {
    return res.status(400).json({
      error: "Keyword must contain between 2 and 50 characters."
    });
  }

  const cacheKey = keyword.toLowerCase();
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.savedAt < CACHE_TIME_MS) {
    return res.json(cached.value);
  }

  try {
    const url =
      "https://users.roblox.com/v1/users/search" +
      `?keyword=${encodeURIComponent(keyword)}` +
      "&limit=10";

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "RobloxUserSearch/1.0"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Roblox returned HTTP ${response.status}`
      });
    }

    const body = await response.json();

    const value = {
      data: (body.data || []).slice(0, 10).map((user) => ({
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        hasVerifiedBadge: user.hasVerifiedBadge === true
      }))
    };

    cache.set(cacheKey, {
      savedAt: Date.now(),
      value
    });

    return res.json(value);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to contact Roblox."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
