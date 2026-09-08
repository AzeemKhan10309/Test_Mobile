class ZodLiteType {
  constructor(parser) {
    this._parser = parser;
  }

  parse(value) {
    return this._parser(value);
  }

  safeParse(value) {
    try {
      return { success: true, data: this.parse(value) };
    } catch (error) {
      return { success: false, error: { issues: [{ message: error.message || 'Validation failed' }] } };
    }
  }

  optional() {
    return new ZodLiteType((value) => (value === undefined ? undefined : this.parse(value)));
  }
}

const string = () => {
  const checks = [];
  const api = new ZodLiteType((value) => {
    if (typeof value !== 'string') throw new Error('Expected string');
    let current = value;
    checks.forEach((check) => {
      current = check(current);
    });
    return current;
  });

  api.trim = () => {
    checks.push((v) => v.trim());
    return api;
  };

  api.min = (limit, message = `Must be at least ${limit} characters`) => {
    checks.push((v) => {
      if (v.length < limit) throw new Error(message);
      return v;
    });
    return api;
  };

  api.max = (limit, message = `Must be at most ${limit} characters`) => {
    checks.push((v) => {
      if (v.length > limit) throw new Error(message);
      return v;
    });
    return api;
  };

  api.url = () => {
    checks.push((v) => {
      try { new URL(v); } catch { throw new Error('Invalid URL'); }
      return v;
    });
    return api;
  };

  api.datetime = () => {
    checks.push((v) => {
      if (Number.isNaN(new Date(v).getTime())) throw new Error('Invalid datetime string');
      return v;
    });
    return api;
  };

  return api;
};

const number = () => {
  const checks = [];
  const api = new ZodLiteType((value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) throw new Error('Expected number');
    let current = value;
    checks.forEach((check) => {
      current = check(current);
    });
    return current;
  });

  api.min = (limit, message = `Must be at least ${limit}`) => {
    checks.push((v) => {
      if (v < limit) throw new Error(message);
      return v;
    });
    return api;
  };

  api.max = (limit, message = `Must be at most ${limit}`) => {
    checks.push((v) => {
      if (v > limit) throw new Error(message);
      return v;
    });
    return api;
  };

  return api;
};

const enumType = (options) => new ZodLiteType((value) => {
  if (!options.includes(value)) throw new Error(`Expected one of: ${options.join(', ')}`);
  return value;
});

const object = (shape) => new ZodLiteType((value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object');
  const result = {};
  for (const [key, schema] of Object.entries(shape)) {
    const parsed = schema.parse(value[key]);
    if (parsed !== undefined) result[key] = parsed;
  }
  return result;
});

export const z = { string, number, enum: enumType, object };