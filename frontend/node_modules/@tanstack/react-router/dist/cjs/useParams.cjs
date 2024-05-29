"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const Matches = require("./Matches.cjs");
function useParams(opts) {
  return Matches.useMatch({
    ...opts,
    select: (match) => {
      return opts.select ? opts.select(match.params) : match.params;
    }
  });
}
exports.useParams = useParams;
//# sourceMappingURL=useParams.cjs.map
