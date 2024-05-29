import * as React from "react";
import { useMatch } from "./Matches.js";
import { useRouter } from "./useRouter.js";
function useNavigate(_defaultOpts) {
  const router = useRouter();
  return React.useCallback(
    (options) => {
      return router.navigate({
        ...options,
        from: options.to ? router.state.resolvedLocation.pathname : void 0
      });
    },
    [router]
  );
}
function Navigate(props) {
  const { navigate } = useRouter();
  const match = useMatch({ strict: false });
  React.useEffect(() => {
    navigate({
      from: props.to ? match.pathname : void 0,
      ...props
    });
  }, []);
  return null;
}
export {
  Navigate,
  useNavigate
};
//# sourceMappingURL=useNavigate.js.map
