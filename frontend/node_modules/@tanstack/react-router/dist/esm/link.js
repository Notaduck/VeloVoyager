import { jsx } from "react/jsx-runtime";
import * as React from "react";
import { flushSync } from "react-dom";
import { useMatch } from "./Matches.js";
import { useRouterState } from "./useRouterState.js";
import { useRouter } from "./useRouter.js";
import { exactPathTest, deepEqual, functionalUpdate } from "./utils.js";
const preloadWarning = "Error preloading route! ☝️";
function useLinkProps(options) {
  const router = useRouter();
  const matchPathname = useMatch({
    strict: false,
    select: (s) => s.pathname
  });
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const {
    // custom props
    activeProps = () => ({ className: "active" }),
    inactiveProps = () => ({}),
    activeOptions,
    hash,
    search,
    params,
    to,
    state,
    mask,
    preload: userPreload,
    preloadDelay: userPreloadDelay,
    replace,
    startTransition,
    resetScroll,
    viewTransition,
    // element props
    children,
    target,
    disabled,
    style,
    className,
    onClick,
    onFocus,
    onMouseEnter,
    onMouseLeave,
    onTouchStart,
    ...rest
  } = options;
  const dest = {
    ...options.to && { from: matchPathname },
    ...options
  };
  let type = "internal";
  try {
    new URL(`${to}`);
    type = "external";
  } catch {
  }
  const next = router.buildLocation(dest);
  const preload = userPreload ?? router.options.defaultPreload;
  const preloadDelay = userPreloadDelay ?? router.options.defaultPreloadDelay ?? 0;
  const isActive = useRouterState({
    select: (s) => {
      const currentPathSplit = s.location.pathname.split("/");
      const nextPathSplit = next.pathname.split("/");
      const pathIsFuzzyEqual = nextPathSplit.every(
        (d, i) => d === currentPathSplit[i]
      );
      const pathTest = (activeOptions == null ? void 0 : activeOptions.exact) ? exactPathTest(s.location.pathname, next.pathname) : pathIsFuzzyEqual;
      const hashTest = (activeOptions == null ? void 0 : activeOptions.includeHash) ? s.location.hash === next.hash : true;
      const searchTest = (activeOptions == null ? void 0 : activeOptions.includeSearch) ?? true ? deepEqual(s.location.search, next.search, !(activeOptions == null ? void 0 : activeOptions.exact)) : true;
      return pathTest && hashTest && searchTest;
    }
  });
  if (type === "external") {
    return {
      ...rest,
      type,
      href: to,
      ...children && { children },
      ...target && { target },
      ...disabled && { disabled },
      ...style && { style },
      ...className && { className },
      ...onClick && { onClick },
      ...onFocus && { onFocus },
      ...onMouseEnter && { onMouseEnter },
      ...onMouseLeave && { onMouseLeave },
      ...onTouchStart && { onTouchStart }
    };
  }
  const handleClick = (e) => {
    if (!disabled && !isCtrlEvent(e) && !e.defaultPrevented && (!target || target === "_self") && e.button === 0) {
      e.preventDefault();
      flushSync(() => {
        setIsTransitioning(true);
      });
      const unsub = router.subscribe("onResolved", () => {
        unsub();
        setIsTransitioning(false);
      });
      router.commitLocation({
        ...next,
        replace,
        resetScroll,
        startTransition,
        viewTransition
      });
    }
  };
  const doPreload = () => {
    router.preloadRoute(dest).catch((err) => {
      console.warn(err);
      console.warn(preloadWarning);
    });
  };
  const handleFocus = (e) => {
    if (disabled)
      return;
    if (preload) {
      doPreload();
    }
  };
  const handleTouchStart = handleFocus;
  const handleEnter = (e) => {
    if (disabled)
      return;
    const eventTarget = e.target || {};
    if (preload) {
      if (eventTarget.preloadTimeout) {
        return;
      }
      eventTarget.preloadTimeout = setTimeout(() => {
        eventTarget.preloadTimeout = null;
        doPreload();
      }, preloadDelay);
    }
  };
  const handleLeave = (e) => {
    if (disabled)
      return;
    const eventTarget = e.target || {};
    if (eventTarget.preloadTimeout) {
      clearTimeout(eventTarget.preloadTimeout);
      eventTarget.preloadTimeout = null;
    }
  };
  const composeHandlers = (handlers) => (e) => {
    var _a;
    (_a = e.persist) == null ? void 0 : _a.call(e);
    handlers.filter(Boolean).forEach((handler) => {
      if (e.defaultPrevented)
        return;
      handler(e);
    });
  };
  const resolvedActiveProps = isActive ? functionalUpdate(activeProps, {}) ?? {} : {};
  const resolvedInactiveProps = isActive ? {} : functionalUpdate(inactiveProps, {});
  const resolvedClassName = [
    className,
    resolvedActiveProps.className,
    resolvedInactiveProps.className
  ].filter(Boolean).join(" ");
  const resolvedStyle = {
    ...style,
    ...resolvedActiveProps.style,
    ...resolvedInactiveProps.style
  };
  return {
    ...resolvedActiveProps,
    ...resolvedInactiveProps,
    ...rest,
    href: disabled ? void 0 : next.maskedLocation ? router.history.createHref(next.maskedLocation.href) : router.history.createHref(next.href),
    onClick: composeHandlers([onClick, handleClick]),
    onFocus: composeHandlers([onFocus, handleFocus]),
    onMouseEnter: composeHandlers([onMouseEnter, handleEnter]),
    onMouseLeave: composeHandlers([onMouseLeave, handleLeave]),
    onTouchStart: composeHandlers([onTouchStart, handleTouchStart]),
    disabled: !!disabled,
    target,
    ...Object.keys(resolvedStyle).length && { style: resolvedStyle },
    ...resolvedClassName && { className: resolvedClassName },
    ...disabled && {
      role: "link",
      "aria-disabled": true
    },
    ...isActive && { "data-status": "active", "aria-current": "page" },
    ...isTransitioning && { "data-transitioning": "transitioning" }
  };
}
function createLink(Comp) {
  return React.forwardRef(function CreatedLink(props, ref) {
    return /* @__PURE__ */ jsx(Link, { ...props, _asChild: Comp, ref });
  });
}
const Link = React.forwardRef((props, ref) => {
  const { _asChild, ...rest } = props;
  const { type, ...linkProps } = useLinkProps(rest);
  const children = typeof rest.children === "function" ? rest.children({
    isActive: linkProps["data-status"] === "active"
  }) : rest.children;
  if (typeof _asChild === "undefined") {
    delete linkProps.disabled;
  }
  return React.createElement(
    _asChild ? _asChild : "a",
    {
      ...linkProps,
      ref
    },
    children
  );
});
function isCtrlEvent(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}
export {
  Link,
  createLink,
  useLinkProps
};
//# sourceMappingURL=link.js.map
