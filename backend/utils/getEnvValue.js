const getEnvValue = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

module.exports = getEnvValue;
