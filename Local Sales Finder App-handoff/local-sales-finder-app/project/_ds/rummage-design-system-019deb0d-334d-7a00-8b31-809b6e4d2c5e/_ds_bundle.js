/* @ds-bundle: {"format":3,"namespace":"RummageDesignSystem_019deb","components":[{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"ListRow","sourcePath":"components/data/ListRow.jsx"},{"name":"SaleCard","sourcePath":"components/data/SaleCard.jsx"},{"name":"SaleTypeTag","sourcePath":"components/data/SaleTypeTag.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"FilterChip","sourcePath":"components/forms/FilterChip.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"AppHeader","sourcePath":"components/navigation/AppHeader.jsx"},{"name":"DistanceStepper","sourcePath":"components/navigation/DistanceStepper.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"}],"sourceHashes":{"components/data/Avatar.jsx":"3ecc4396c792","components/data/Badge.jsx":"b546252af8eb","components/data/Card.jsx":"93b164cff354","components/data/ListRow.jsx":"c07e4e229125","components/data/SaleCard.jsx":"de69dc1aa5b4","components/data/SaleTypeTag.jsx":"a3b8cbcd2a87","components/forms/Button.jsx":"8cc692fb3a1b","components/forms/FilterChip.jsx":"8529d64547ba","components/forms/IconButton.jsx":"da0877967736","components/forms/Input.jsx":"13501556edf7","components/forms/SegmentedControl.jsx":"6e5e99609e95","components/forms/Switch.jsx":"72266ef3d8a5","components/navigation/AppHeader.jsx":"762fdb674c2b","components/navigation/DistanceStepper.jsx":"76009ebdc7a7","components/navigation/TabBar.jsx":"e343e3de152b","ui_kits/ios_app/DetailScreen.jsx":"d0cfdecbc098","ui_kits/ios_app/ExploreScreen.jsx":"fffbdef103b1","ui_kits/ios_app/FauxMap.jsx":"86d3ce599d3a","ui_kits/ios_app/FiltersScreen.jsx":"d2dd43ad810b","ui_kits/ios_app/OnboardingScreen.jsx":"fe80a513b0db","ui_kits/ios_app/SavedScreen.jsx":"4770679e381b","ui_kits/ios_app/SearchScreen.jsx":"def9878c1637","ui_kits/ios_app/SettingsScreen.jsx":"1098b8af659d","ui_kits/ios_app/data.js":"e75bbb7a5e2a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RummageDesignSystem_019deb = window.RummageDesignSystem_019deb || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data/Avatar.jsx
try { (() => {
/** Avatar with initials fallback. Used for sale hosts / sellers. */
function Avatar({
  src,
  name = '',
  size = 40,
  style
}) {
  const initials = name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      flex: '0 0 auto',
      borderRadius: '50%',
      background: 'var(--teal-100)',
      color: 'var(--teal-700)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-bold)',
      fontSize: Math.round(size * 0.38),
      overflow: 'hidden',
      border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-xs)',
      ...style
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials || '?');
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
/** Small status/label badge. Neutral by default; tones map to semantic colors. */
function Badge({
  children,
  tone = 'neutral',
  leadingIcon = null,
  style
}) {
  const tones = {
    neutral: {
      bg: 'var(--surface-sunken)',
      fg: 'var(--text-secondary)'
    },
    accent: {
      bg: 'var(--accent-soft)',
      fg: 'var(--accent)'
    },
    teal: {
      bg: 'var(--secondary-soft)',
      fg: 'var(--secondary)'
    },
    success: {
      bg: 'var(--success-bg)',
      fg: 'var(--success)'
    },
    warning: {
      bg: 'var(--warning-bg)',
      fg: 'var(--warning)'
    },
    danger: {
      bg: 'var(--danger-bg)',
      fg: 'var(--danger)'
    },
    live: {
      bg: 'var(--success-bg)',
      fg: 'var(--success)'
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: leadingIcon ? '0 9px 0 7px' : '0 9px',
      borderRadius: 'var(--radius-pill)',
      background: t.bg,
      color: t.fg,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-2xs)',
      letterSpacing: 'var(--tracking-snug)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, tone === 'live' && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--success)',
      boxShadow: '0 0 0 3px var(--success-bg)'
    }
  }), leadingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 13,
      height: 13
    }
  }, leadingIcon), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
/** Generic surface container. Base for sale cards, sheets, list groups. */
function Card({
  children,
  elevation = 'sm',
  padded = true,
  interactive = false,
  onClick,
  style
}) {
  const shadows = {
    none: 'none',
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)'
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: shadows[elevation] || shadows.sm,
      padding: padded ? 'var(--space-4)' : 0,
      cursor: interactive ? 'pointer' : 'default',
      transition: interactive ? 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)' : 'none',
      overflow: 'hidden',
      ...style
    },
    onPointerDown: interactive ? e => {
      e.currentTarget.style.transform = 'scale(0.985)';
    } : undefined,
    onPointerUp: interactive ? e => {
      e.currentTarget.style.transform = 'scale(1)';
    } : undefined,
    onPointerLeave: interactive ? e => {
      e.currentTarget.style.transform = 'scale(1)';
    } : undefined
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/ListRow.jsx
try { (() => {
/** Settings / menu list row. iOS grouped-list style. */
function ListRow({
  icon = null,
  label,
  sublabel = null,
  trailing = null,
  value = null,
  onClick,
  first = false,
  danger = false,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 13,
      width: '100%',
      padding: '13px 16px',
      background: 'transparent',
      border: 'none',
      borderTop: first ? 'none' : '1px solid var(--border-default)',
      cursor: onClick ? 'pointer' : 'default',
      textAlign: 'left',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-sm)',
      flex: '0 0 auto',
      background: danger ? 'var(--danger-bg)' : 'var(--surface-sunken)',
      color: danger ? 'var(--danger)' : 'var(--text-secondary)'
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-base)',
      color: danger ? 'var(--danger)' : 'var(--text-primary)'
    }
  }, label), sublabel && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      marginTop: 1
    }
  }, sublabel)), value != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-muted)'
    }
  }, value), trailing);
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/data/SaleTypeTag.jsx
try { (() => {
const TYPES = {
  estate: {
    label: 'Estate Sale',
    fg: 'var(--type-estate-fg)',
    bg: 'var(--type-estate-bg)',
    icon: 'Armchair'
  },
  yard: {
    label: 'Yard Sale',
    fg: 'var(--type-yard-fg)',
    bg: 'var(--type-yard-bg)',
    icon: 'Tent'
  },
  thrift: {
    label: 'Thrift Store',
    fg: 'var(--type-thrift-fg)',
    bg: 'var(--type-thrift-bg)',
    icon: 'Store'
  },
  moving: {
    label: 'Moving Sale',
    fg: 'var(--type-moving-fg)',
    bg: 'var(--type-moving-bg)',
    icon: 'Truck'
  },
  auction: {
    label: 'Auction',
    fg: 'var(--type-auction-fg)',
    bg: 'var(--type-auction-bg)',
    icon: 'Gavel'
  }
};

/** Categorical tag for the five sale types. Soft tinted bg + dark fg. */
function SaleTypeTag({
  type = 'estate',
  size = 'md',
  icon = null,
  style
}) {
  const t = TYPES[type] || TYPES.estate;
  const sm = size === 'sm';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: sm ? 4 : 5,
      height: sm ? 22 : 26,
      padding: icon ? `0 ${sm ? 8 : 10}px 0 ${sm ? 6 : 8}px` : `0 ${sm ? 9 : 11}px`,
      borderRadius: 'var(--radius-pill)',
      background: t.bg,
      color: t.fg,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-bold)',
      fontSize: sm ? 'var(--text-2xs)' : 'var(--text-xs)',
      letterSpacing: 'var(--tracking-snug)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: sm ? 12 : 14,
      height: sm ? 12 : 14
    }
  }, icon), t.label);
}

/** Exposed so kits can label legends / map pins by type. */
SaleTypeTag.TYPES = TYPES;
Object.assign(__ds_scope, { SaleTypeTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SaleTypeTag.jsx", error: String((e && e.message) || e) }); }

// components/data/SaleCard.jsx
try { (() => {
function HeartButton({
  saved,
  onSave
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": saved ? 'Remove from saved' : 'Save sale',
    onClick: e => {
      e.stopPropagation();
      onSave && onSave(!saved);
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(255,253,248,0.92)',
      backdropFilter: 'blur(6px)',
      boxShadow: 'var(--shadow-sm)',
      cursor: 'pointer',
      flex: '0 0 auto',
      transition: 'transform var(--dur-fast) var(--ease-spring)',
      WebkitTapHighlightColor: 'transparent'
    },
    onPointerDown: e => {
      e.currentTarget.style.transform = 'scale(0.85)';
    },
    onPointerUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "19",
    viewBox: "0 0 24 24",
    fill: saved ? 'var(--accent)' : 'none',
    stroke: saved ? 'var(--accent)' : 'var(--ink-700)',
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
  })));
}

/** Photo placeholder: warm paper with a faint pin glyph. */
function Placeholder({
  height
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      background: 'linear-gradient(135deg, var(--brand-50), var(--paper-2))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "34",
    height: "34",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--ink-300)",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })));
}

/** The marquee Rummage listing card. Two layouts: stacked photo, or row thumbnail. */
function SaleCard({
  type = 'estate',
  title,
  address,
  distanceMi,
  dateLabel,
  timeLabel,
  image,
  photoCount,
  saved = false,
  onSave,
  onClick,
  live = false,
  layout = 'full',
  style
}) {
  const dist = distanceMi != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-secondary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, distanceMi, " mi");
  if (layout === 'row') {
    return /*#__PURE__*/React.createElement(__ds_scope.Card, {
      interactive: true,
      onClick: onClick,
      padded: false,
      elevation: "sm",
      style: style
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 104,
        flex: '0 0 auto',
        position: 'relative'
      }
    }, image ? /*#__PURE__*/React.createElement("img", {
      src: image,
      alt: title,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    }) : /*#__PURE__*/React.createElement(Placeholder, {
      height: "100%"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.SaleTypeTag, {
      type: type,
      size: "sm"
    }), live && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
      tone: "live"
    }, "Now")), /*#__PURE__*/React.createElement("h3", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--weight-semibold)',
        fontSize: 'var(--text-md)',
        lineHeight: 'var(--leading-tight)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)'
      }
    }, dist, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": true
    }, "\xB7"), /*#__PURE__*/React.createElement("span", {
      style: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, dateLabel)))));
  }
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    interactive: true,
    onClick: onClick,
    padded: false,
    elevation: "md",
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: title,
    style: {
      width: '100%',
      height: 168,
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement(Placeholder, {
    height: 168
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SaleTypeTag, {
    type: type,
    icon: null
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      right: 12
    }
  }, /*#__PURE__*/React.createElement(HeartButton, {
    saved: saved,
    onSave: onSave
  })), live && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      left: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "live"
  }, "Happening now")), photoCount != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      height: 24,
      padding: '0 8px',
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(28,25,23,0.6)',
      backdropFilter: 'blur(4px)',
      color: '#fff',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "9",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21"
  })), photoCount)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-xl)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-snug)',
      color: 'var(--text-primary)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: '0 0 auto',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, address)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      paddingTop: 4,
      borderTop: '1px solid var(--border-default)',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-primary)',
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 2v4M8 2v4M3 10h18"
  })), dateLabel), timeLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      paddingTop: 8
    }
  }, timeLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      paddingTop: 8
    }
  }, dist))));
}
Object.assign(__ds_scope, { SaleCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SaleCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rummage primary action button. Terracotta-filled by default; warm,
 * tactile press state. Uses design tokens only.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  fullWidth = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      height: 36,
      padding: '0 14px',
      font: 'var(--text-sm)',
      gap: 6,
      icon: 16
    },
    md: {
      height: 46,
      padding: '0 18px',
      font: 'var(--text-base)',
      gap: 8,
      icon: 18
    },
    lg: {
      height: 54,
      padding: '0 24px',
      font: 'var(--text-md)',
      gap: 9,
      icon: 20
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-sm)'
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
      boxShadow: 'var(--shadow-xs)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1px solid transparent'
    },
    teal: {
      background: 'var(--secondary)',
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-sm)'
    },
    danger: {
      background: 'var(--danger-bg)',
      color: 'var(--danger)',
      border: '1px solid transparent'
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    className: "rmg-btn",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: s.font,
      letterSpacing: 'var(--tracking-snug)',
      borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...v,
      ...style
    },
    onPointerDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onPointerUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onPointerLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, rest), leadingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: s.icon,
      height: s.icon
    }
  }, leadingIcon), children, trailingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: s.icon,
      height: s.icon
    }
  }, trailingIcon));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/FilterChip.jsx
try { (() => {
/** Pill filter chip — selectable. For sale-type & quick filters above the map/list. */
function FilterChip({
  children,
  selected = false,
  leadingIcon = null,
  count,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": selected,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      flex: '0 0 auto',
      height: 36,
      padding: leadingIcon ? '0 14px 0 11px' : '0 14px',
      borderRadius: 'var(--radius-pill)',
      background: selected ? 'var(--ink-900)' : 'var(--surface-card)',
      color: selected ? 'var(--paper)' : 'var(--text-secondary)',
      border: `1px solid ${selected ? 'var(--ink-900)' : 'var(--border-default)'}`,
      boxShadow: selected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      cursor: 'pointer',
      transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, leadingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 16,
      height: 16
    }
  }, leadingIcon), children, count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      padding: '1px 6px',
      borderRadius: 'var(--radius-pill)',
      background: selected ? 'rgba(255,255,255,0.22)' : 'var(--surface-sunken)',
      color: selected ? 'var(--paper)' : 'var(--text-muted)'
    }
  }, count));
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square/circular icon-only button. For map controls, headers, close buttons. */
function IconButton({
  icon,
  variant = 'surface',
  size = 'md',
  shape = 'rounded',
  disabled = false,
  'aria-label': ariaLabel,
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: 34,
    md: 42,
    lg: 50
  };
  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 24
  };
  const dim = sizes[size] || sizes.md;
  const variants = {
    surface: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-sm)'
    },
    solid: {
      background: 'var(--accent)',
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-sm)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent'
    },
    soft: {
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
      border: '1px solid var(--accent-soft-bd)'
    }
  };
  const v = variants[variant] || variants.surface;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      flex: '0 0 auto',
      borderRadius: shape === 'circle' ? 'var(--radius-pill)' : 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...v,
      ...style
    },
    onPointerDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.92)';
    },
    onPointerUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onPointerLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: iconSizes[size],
      height: iconSizes[size]
    }
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text / search input with optional leading + trailing icons. */
function Input({
  value,
  onChange,
  placeholder,
  leadingIcon = null,
  trailingIcon = null,
  type = 'text',
  inputMode,
  size = 'md',
  disabled = false,
  style,
  inputStyle,
  ...rest
}) {
  const sizes = {
    md: {
      height: 46,
      font: 'var(--text-base)',
      pad: 14
    },
    lg: {
      height: 54,
      font: 'var(--text-md)',
      pad: 16
    }
  };
  const s = sizes[size] || sizes.md;
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: s.height,
      padding: `0 ${s.pad}px`,
      background: 'var(--surface-card)',
      border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focused ? 'var(--shadow-focus)' : 'var(--shadow-xs)',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, leadingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 19,
      height: 19,
      color: 'var(--text-muted)',
      flex: '0 0 auto'
    }
  }, leadingIcon), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    type: type,
    inputMode: inputMode,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: s.font,
      color: 'var(--text-primary)',
      ...inputStyle
    }
  }, rest)), trailingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 19,
      height: 19,
      color: 'var(--text-muted)',
      flex: '0 0 auto'
    }
  }, trailingIcon));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
/** Segmented control — the Map / List toggle and date-range switcher. */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  style
}) {
  const heights = {
    sm: 34,
    md: 40
  };
  const h = heights[size] || heights.md;
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'inline-flex',
      position: 'relative',
      padding: 3,
      gap: 2,
      height: h,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      ...style
    }
  }, options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? opt : opt.label;
    const icon = typeof opt === 'string' ? null : opt.icon;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(val),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 16px',
        height: '100%',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--surface-card)' : 'transparent',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
        WebkitTapHighlightColor: 'transparent'
      }
    }, icon && /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        width: 16,
        height: 16
      }
    }, icon), label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/** iOS-style toggle switch. Terracotta when on. */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  style
}) {
  const dims = {
    md: {
      w: 52,
      h: 32,
      k: 26
    },
    sm: {
      w: 44,
      h: 26,
      k: 21
    }
  };
  const d = dims[size] || dims.md;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: 'relative',
      width: d.w,
      height: d.h,
      flex: '0 0 auto',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      padding: 0,
      background: checked ? 'var(--accent)' : 'var(--ink-300)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--dur-base) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: (d.h - d.k) / 2,
      left: checked ? d.w - d.k - (d.h - d.k) / 2 : (d.h - d.k) / 2,
      width: d.k,
      height: d.k,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(28,25,23,0.3)',
      transition: 'left var(--dur-base) var(--ease-spring)'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/AppHeader.jsx
try { (() => {
/** Screen header. Serif title, optional back button + trailing actions. */
function AppHeader({
  title,
  eyebrow = null,
  onBack,
  trailing = null,
  large = false,
  transparent = false,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      flexDirection: large ? 'column' : 'row',
      alignItems: large ? 'flex-start' : 'center',
      gap: large ? 6 : 12,
      padding: large ? '8px 20px 14px' : '0 12px 0 8px',
      minHeight: large ? 'auto' : 'var(--header-height)',
      background: transparent ? 'transparent' : 'rgba(250,246,238,0.82)',
      backdropFilter: transparent ? 'none' : 'blur(16px) saturate(1.3)',
      borderBottom: transparent ? 'none' : '1px solid var(--border-default)',
      ...style
    }
  }, !large && onBack && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Back",
    onClick: onBack,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: 'none',
      background: transparent ? 'rgba(255,253,248,0.9)' : 'transparent',
      boxShadow: transparent ? 'var(--shadow-sm)' : 'none',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m15 18-6-6 6-6"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "rmg-eyebrow",
    style: {
      marginBottom: 2
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: large ? 'var(--weight-semibold)' : 'var(--weight-medium)',
      fontSize: large ? 'var(--text-3xl)' : 'var(--text-lg)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--text-primary)',
      overflow: large ? 'visible' : 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: large ? 'normal' : 'nowrap',
      textAlign: large ? 'left' : onBack ? 'left' : 'left'
    }
  }, title)), trailing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flex: '0 0 auto'
    }
  }, trailing));
}
Object.assign(__ds_scope, { AppHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/AppHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/DistanceStepper.jsx
try { (() => {
/** Search-radius control: a slider with a mono value read-out and preset chips. */
function DistanceStepper({
  value = 25,
  onChange,
  min = 1,
  max = 100,
  presets = [5, 10, 25, 50],
  style
}) {
  const pct = (value - min) / (max - min) * 100;
  const set = v => onChange && onChange(Math.max(min, Math.min(max, v)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-primary)'
    }
  }, "Search radius"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-lg)',
      color: 'var(--accent)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      marginLeft: 2
    }
  }, "mi"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 28,
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--ink-200)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      width: `${pct}%`,
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    value: value,
    onChange: e => set(Number(e.target.value)),
    "aria-label": "Search radius in miles",
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      width: '100%',
      margin: 0,
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'transparent',
      height: 28,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: `calc(${pct}% - 13px)`,
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: 'var(--surface-card)',
      border: '2px solid var(--accent)',
      boxShadow: 'var(--shadow-md)',
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, presets.map(p => {
    const active = p === value;
    return /*#__PURE__*/React.createElement("button", {
      key: p,
      type: "button",
      onClick: () => set(p),
      style: {
        flex: 1,
        height: 38,
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
        background: active ? 'var(--accent-soft)' : 'var(--surface-card)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 'var(--weight-medium)',
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        transition: 'all var(--dur-fast) var(--ease-out)'
      }
    }, p, " mi");
  })));
}
Object.assign(__ds_scope, { DistanceStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/DistanceStepper.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
/** iOS bottom tab bar. Active tab in terracotta. Pass icon nodes per item. */
function TabBar({
  items = [],
  active,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      width: '100%',
      background: 'rgba(255,253,248,0.86)',
      backdropFilter: 'blur(18px) saturate(1.4)',
      borderTop: '1px solid var(--border-default)',
      paddingBottom: 'env(safe-area-inset-bottom, 18px)',
      ...style
    }
  }, items.map(it => {
    const isActive = it.key === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      type: "button",
      "aria-label": it.label,
      "aria-current": isActive,
      onClick: () => onChange && onChange(it.key),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '9px 0 7px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: isActive ? 'var(--accent)' : 'var(--text-faint)',
        transition: 'color var(--dur-fast) var(--ease-out)',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        width: 24,
        height: 24,
        position: 'relative'
      }
    }, it.icon, it.badge && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -3,
        right: -5,
        minWidth: 8,
        height: 8,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--accent)',
        border: '1.5px solid var(--surface-raised)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontWeight: isActive ? 'var(--weight-bold)' : 'var(--weight-medium)',
        fontSize: '10.5px',
        letterSpacing: 'var(--tracking-snug)'
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/DetailScreen.jsx
try { (() => {
/* DetailScreen — full sale detail with photo header, info, items, and action bar. */
function DetailScreen({
  sale,
  onBack,
  onToggleSave
}) {
  const {
    SaleTypeTag,
    Badge,
    Button,
    IconButton,
    Avatar,
    Card
  } = window.RummageDesignSystem_019deb;
  const Icon = window.Icon;
  const s = sale;
  const Placeholder = ({
    h,
    big
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      height: h,
      flex: '1 0 auto',
      background: 'linear-gradient(135deg, var(--brand-50), var(--paper-2))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, Icon('Image', big ? 40 : 22, {
    stroke: 'var(--ink-300)',
    sw: 1.5
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 280
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    h: 280,
    big: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(28,25,23,0.28) 0%, transparent 28%, transparent 70%, rgba(28,25,23,0.12) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'var(--safe-top)',
      left: 14,
      right: 14,
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: Icon('ChevronLeft', 22),
    shape: "circle",
    "aria-label": "Back",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: Icon('Share', 19),
    shape: "circle",
    "aria-label": "Share"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: Icon('Heart', 19, s.saved ? {
      fill: 'var(--accent)',
      stroke: 'var(--accent)'
    } : {}),
    shape: "circle",
    "aria-label": "Save",
    onClick: () => onToggleSave(s.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      right: 14,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 26,
      padding: '0 10px',
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(28,25,23,0.6)',
      backdropFilter: 'blur(4px)',
      color: '#fff',
      fontFamily: 'var(--font-mono)',
      fontSize: 11
    }
  }, Icon('Camera', 13, {
    stroke: '#fff'
  }), " 1 / ", s.photoCount)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(SaleTypeTag, {
    type: s.type,
    icon: Icon(window.CAT[s.type].glyph, 13, {
      stroke: 'currentColor',
      sw: 2
    })
  }), s.live && /*#__PURE__*/React.createElement(Badge, {
    tone: "live"
  }, "Happening now")), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 28,
      lineHeight: 1.12,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)'
    }
  }, s.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      margin: '18px 0'
    }
  }, [['Calendar', s.dateLabel, s.timeLabel], ['MapPin', s.address, `${s.distanceMi} mi away`], ['Tag', 'Price range', s.price]].map(([ic, a, b], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-sunken)',
      color: 'var(--accent)',
      flex: '0 0 auto'
    }
  }, Icon(ic, 18, {
    stroke: 'currentColor'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, a), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: i === 0 || i === 1 ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, b)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 18px',
      height: 130,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement(window.FauxMap, {
    sales: [{
      ...s,
      x: 50,
      y: 52
    }],
    selectedId: s.id,
    onSelect: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px 6px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      color: 'var(--text-primary)',
      marginBottom: 8
    }
  }, "About this sale"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      lineHeight: 1.55,
      color: 'var(--text-secondary)',
      textWrap: 'pretty'
    }
  }, s.blurb)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px 8px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      color: 'var(--text-primary)',
      marginBottom: 10
    }
  }, "What you'll find"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, s.items.map(it => /*#__PURE__*/React.createElement("span", {
    key: it,
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 13,
      color: 'var(--text-secondary)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      padding: '7px 12px',
      borderRadius: 'var(--radius-pill)'
    }
  }, it)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px 24px'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: s.host,
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, s.host), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, Icon('BadgeCheck', 13, {
    stroke: 'var(--secondary)'
  }), " Verified host")), Icon('ChevronRight', 20, {
    stroke: 'var(--text-faint)'
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      padding: '12px 16px',
      paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 16px))',
      background: 'rgba(255,253,248,0.92)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    leadingIcon: Icon('Navigation', 18)
  }, "Directions"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    leadingIcon: Icon('Bell', 18)
  }, "Remind me"))));
}
window.DetailScreen = DetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/DetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/ExploreScreen.jsx
try { (() => {
/* ExploreScreen — the home view: faux map + filter chips + results sheet. */
function ExploreScreen({
  sales,
  onOpenSale,
  onOpenFilters,
  onToggleSave,
  radiusMi
}) {
  const {
    SegmentedControl,
    FilterChip,
    SaleCard,
    IconButton,
    Badge
  } = window.RummageDesignSystem_019deb;
  const [view, setView] = React.useState('map');
  const [selected, setSelected] = React.useState(sales[0].id);
  const [activeTypes, setActiveTypes] = React.useState({});
  const Icon = window.Icon;
  const anyType = Object.values(activeTypes).some(Boolean);
  const shown = anyType ? sales.filter(s => activeTypes[s.type]) : sales;
  const sel = shown.find(s => s.id === selected) || shown[0];
  const ChipRow = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      padding: '0 16px 2px',
      WebkitOverflowScrolling: 'touch'
    }
  }, /*#__PURE__*/React.createElement(FilterChip, {
    leadingIcon: Icon('SlidersHorizontal', 15),
    onClick: onOpenFilters
  }, "Filters"), window.FILTER_TYPES.map(t => /*#__PURE__*/React.createElement(FilterChip, {
    key: t.key,
    selected: !!activeTypes[t.key],
    onClick: () => setActiveTypes(p => ({
      ...p,
      [t.key]: !p[t.key]
    }))
  }, t.label)), /*#__PURE__*/React.createElement(FilterChip, {
    leadingIcon: Icon('Clock', 15)
  }, "Open now"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--safe-top)',
      background: 'rgba(250,246,238,0.9)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-default)',
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 16px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rmg-eyebrow",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, Icon('MapPin', 12, {
    stroke: 'var(--accent)'
  }), " Oakland, CA \xB7 94610"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 26,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)',
      lineHeight: 1.1,
      marginTop: 1
    }
  }, "Sales near you")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--accent)',
      fontWeight: 500,
      background: 'var(--accent-soft)',
      padding: '6px 10px',
      borderRadius: 'var(--radius-pill)'
    }
  }, radiusMi, " mi"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      paddingBottom: 12
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    options: [{
      value: 'map',
      label: 'Map',
      icon: Icon('Map', 16)
    }, {
      value: 'list',
      label: 'List',
      icon: Icon('List', 16)
    }],
    value: view,
    onChange: setView
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 12
    }
  }, ChipRow)), view === 'map' ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(window.FauxMap, {
    sales: shown,
    selectedId: sel && sel.id,
    onSelect: setSelected,
    radiusMi: radiusMi
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 14,
      top: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: Icon('Locate', 20),
    "aria-label": "Locate me"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: Icon('Layers', 20),
    variant: "surface",
    "aria-label": "Map layers"
  })), sel && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 16
    }
  }, /*#__PURE__*/React.createElement(SaleCard, {
    layout: "row",
    type: sel.type,
    title: sel.title,
    address: sel.neighborhood,
    distanceMi: sel.distanceMi,
    dateLabel: `${sel.dateLabel} · ${sel.timeLabel}`,
    live: sel.live,
    onClick: () => onOpenSale(sel.id)
  }))) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '14px 16px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, shown.length, " sales nearby"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, Icon('ArrowUpDown', 14), " Closest")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, shown.map(s => /*#__PURE__*/React.createElement(SaleCard, {
    key: s.id,
    type: s.type,
    title: s.title,
    address: s.address,
    distanceMi: s.distanceMi,
    dateLabel: s.dateLabel,
    timeLabel: s.timeLabel,
    photoCount: s.photoCount,
    live: s.live,
    saved: s.saved,
    onSave: () => onToggleSave(s.id),
    onClick: () => onOpenSale(s.id)
  })))));
}
window.ExploreScreen = ExploreScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/ExploreScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/FauxMap.jsx
try { (() => {
/* FauxMap — stylised stand-in for the live map SDK. Streets via CSS, type-coloured pins. */
function FauxMap({
  sales,
  selectedId,
  onSelect,
  radiusMi = 25,
  style
}) {
  const typeColor = {
    estate: 'var(--type-estate-fg)',
    yard: 'var(--type-yard-fg)',
    thrift: 'var(--type-thrift-fg)',
    moving: 'var(--type-moving-fg)',
    auction: 'var(--type-auction-fg)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background: '#EDE7D7',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '-6%',
      top: '8%',
      width: '38%',
      height: '30%',
      background: '#DCE6CF',
      borderRadius: 28,
      transform: 'rotate(-6deg)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: '-10%',
      bottom: '6%',
      width: '44%',
      height: '34%',
      background: '#CFE2DE',
      borderRadius: 30,
      transform: 'rotate(8deg)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '12%',
      bottom: '-8%',
      width: '30%',
      height: '26%',
      background: '#DCE6CF',
      borderRadius: 26
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0.5,
      backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 52px, #FBF8F0 52px 58px), repeating-linear-gradient(90deg, transparent 0 64px, #FBF8F0 64px 70px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0.7,
      backgroundImage: 'repeating-linear-gradient(28deg, transparent 0 120px, #FBF8F0 120px 130px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 220,
      height: 220,
      transform: 'translate(-50%,-50%)',
      borderRadius: '50%',
      border: '2px dashed rgba(194,65,12,0.4)',
      background: 'rgba(194,65,12,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#2563EB',
      border: '3px solid #fff',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
    }
  })), sales.map(s => {
    const sel = s.id === selectedId;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      type: "button",
      onClick: () => onSelect && onSelect(s.id),
      style: {
        position: 'absolute',
        left: s.x + '%',
        top: s.y + '%',
        transform: `translate(-50%,-100%) scale(${sel ? 1.18 : 1})`,
        transformOrigin: 'bottom center',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0,
        transition: 'transform var(--dur-base) var(--ease-spring)',
        zIndex: sel ? 5 : 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(45deg)',
        background: sel ? typeColor[s.type] : '#fff',
        border: `2px solid ${typeColor[s.type]}`,
        boxShadow: sel ? 'var(--shadow-lg)' : 'var(--shadow-md)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        transform: 'rotate(-45deg)',
        display: 'inline-flex',
        color: sel ? '#fff' : typeColor[s.type]
      }
    }, window.Icon(window.CAT[s.type].glyph, 16, {
      stroke: 'currentColor',
      sw: 2.2
    }))), s.live && !sel && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: 'var(--live)',
        border: '1.5px solid #fff'
      }
    }));
  }));
}
window.FauxMap = FauxMap;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/FauxMap.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/FiltersScreen.jsx
try { (() => {
/* FiltersScreen — modal bottom sheet of filter controls. */
function FiltersScreen({
  onClose,
  radiusMi,
  setRadiusMi
}) {
  const {
    IconButton,
    FilterChip,
    SegmentedControl,
    DistanceStepper,
    Switch,
    Button
  } = window.RummageDesignSystem_019deb;
  const Icon = window.Icon;
  const [types, setTypes] = React.useState({
    estate: true,
    auction: true
  });
  const [when, setWhen] = React.useState('weekend');
  const [openNow, setOpenNow] = React.useState(false);
  const [photos, setPhotos] = React.useState(true);
  const [verified, setVerified] = React.useState(false);
  const Toggle = ({
    label,
    on,
    set
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '13px 0',
      borderTop: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement(Switch, {
    checked: on,
    onChange: set
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(28,25,23,0.42)',
      backdropFilter: 'blur(2px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      boxShadow: 'var(--shadow-sheet)',
      maxHeight: '90%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      color: 'var(--text-primary)'
    }
  }, "Filters"), /*#__PURE__*/React.createElement(IconButton, {
    size: "sm",
    variant: "ghost",
    icon: Icon('X', 20),
    "aria-label": "Close",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: 'auto',
      padding: '4px 20px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 15,
      marginBottom: 10
    }
  }, "Sale type"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, window.FILTER_TYPES.map(t => /*#__PURE__*/React.createElement(FilterChip, {
    key: t.key,
    selected: !!types[t.key],
    leadingIcon: Icon(window.CAT[t.key].glyph, 15),
    onClick: () => setTypes(p => ({
      ...p,
      [t.key]: !p[t.key]
    }))
  }, t.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 15,
      marginBottom: 10
    }
  }, "When"), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: [{
      value: 'today',
      label: 'Today'
    }, {
      value: 'weekend',
      label: 'This weekend'
    }, {
      value: 'week',
      label: 'This week'
    }],
    value: when,
    onChange: setWhen,
    style: {
      width: '100%',
      display: 'flex'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(DistanceStepper, {
    value: radiusMi,
    onChange: setRadiusMi
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Open right now",
    on: openNow,
    set: setOpenNow
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Has photos",
    on: photos,
    set: setPhotos
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Verified hosts only",
    on: verified,
    set: setVerified
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      padding: '12px 16px',
      paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 16px))',
      borderTop: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg"
  }, "Reset"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onClose
  }, "Show 14 sales")))));
}
window.FiltersScreen = FiltersScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/FiltersScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/OnboardingScreen.jsx
try { (() => {
/* OnboardingScreen — location permission, the first run. */
function OnboardingScreen({
  onAllow,
  onManual
}) {
  const {
    Button
  } = window.RummageDesignSystem_019deb;
  const Icon = window.Icon;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(window.FauxMap, {
    sales: window.SALES,
    selectedId: 's1',
    onSelect: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(250,246,238,0.1) 0%, rgba(250,246,238,0.65) 62%, var(--surface-app) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(var(--safe-top) + 24px)',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/wordmark.svg",
    height: "34",
    alt: "Rummage"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 24px 0',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 32,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)'
    }
  }, "The good stuff is", /*#__PURE__*/React.createElement("br", null), "right around the corner"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      lineHeight: 1.5,
      color: 'var(--text-secondary)',
      margin: '12px auto 0',
      maxWidth: 320,
      textWrap: 'pretty'
    }
  }, "Rummage finds estate sales, yard sales, thrift stores and auctions near you. Turn on location to see what's close.")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 24px',
      paddingBottom: 'calc(22px + env(safe-area-inset-bottom, 16px))',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    leadingIcon: Icon('Navigation', 18),
    onClick: onAllow
  }, "Use my location"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg",
    fullWidth: true,
    onClick: onManual
  }, "Enter a ZIP code instead"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-faint)',
      textAlign: 'center',
      margin: '4px auto 0',
      maxWidth: 280,
      lineHeight: 1.4
    }
  }, "We only use your location to find nearby sales. You can change this anytime.")));
}
window.OnboardingScreen = OnboardingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/OnboardingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/SavedScreen.jsx
try { (() => {
/* SavedScreen — your saved sales, grouped by status. */
function SavedScreen({
  sales,
  onOpenSale,
  onToggleSave
}) {
  const {
    SegmentedControl,
    SaleCard,
    Badge
  } = window.RummageDesignSystem_019deb;
  const Icon = window.Icon;
  const [tab, setTab] = React.useState('upcoming');
  const saved = sales.filter(s => s.saved);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflowY: 'auto',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--safe-top)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 20px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rmg-eyebrow",
    style: {
      marginBottom: 4
    }
  }, saved.length, " saved"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 34,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)',
      lineHeight: 1.05
    }
  }, "Saved sales"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    options: [{
      value: 'upcoming',
      label: 'Upcoming'
    }, {
      value: 'happening',
      label: 'Happening'
    }, {
      value: 'past',
      label: 'Past'
    }],
    value: tab,
    onChange: setTab,
    style: {
      width: '100%',
      display: 'flex'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 20px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, saved.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '60px 20px',
      color: 'var(--text-muted)'
    }
  }, Icon('Heart', 36, {
    stroke: 'var(--ink-300)',
    sw: 1.5
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 19,
      color: 'var(--text-secondary)',
      marginTop: 12
    }
  }, "Nothing saved yet"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      marginTop: 4
    }
  }, "Tap the heart on any sale to keep it here.")) : saved.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id
  }, /*#__PURE__*/React.createElement(SaleCard, {
    type: s.type,
    title: s.title,
    address: s.address,
    distanceMi: s.distanceMi,
    dateLabel: s.dateLabel,
    timeLabel: s.timeLabel,
    photoCount: s.photoCount,
    live: s.live,
    saved: s.saved,
    onSave: () => onToggleSave(s.id),
    onClick: () => onOpenSale(s.id)
  }))), saved.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
      padding: '8px 0',
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, Icon('Bell', 14), " We'll remind you before each one starts")));
}
window.SavedScreen = SavedScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/SavedScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/SearchScreen.jsx
try { (() => {
/* SearchScreen — ZIP entry + radius + type toggles. Drives the core search flow. */
function SearchScreen({
  radiusMi,
  setRadiusMi,
  onSearch
}) {
  const {
    Input,
    DistanceStepper,
    Button,
    FilterChip,
    Card
  } = window.RummageDesignSystem_019deb;
  const Icon = window.Icon;
  const [zip, setZip] = React.useState('94610');
  const [types, setTypes] = React.useState({});
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflowY: 'auto',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--safe-top)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 20px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rmg-eyebrow",
    style: {
      marginBottom: 4
    }
  }, "Find a sale"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 34,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)',
      lineHeight: 1.05
    }
  }, "Where are you", /*#__PURE__*/React.createElement("br", null), "hunting?"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Input, {
    size: "lg",
    leadingIcon: Icon('MapPin', 19),
    placeholder: "ZIP code",
    inputMode: "numeric",
    value: zip,
    onChange: e => setZip(e.target.value),
    trailingIcon: Icon('LocateFixed', 18)
  }), /*#__PURE__*/React.createElement(Input, {
    size: "lg",
    leadingIcon: Icon('Search', 19),
    placeholder: "Search items \u2014 e.g. records, tools"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(DistanceStepper, {
    value: radiusMi,
    onChange: setRadiusMi
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--text-primary)',
      marginBottom: 10
    }
  }, "Sale types"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, window.FILTER_TYPES.map(t => /*#__PURE__*/React.createElement(FilterChip, {
    key: t.key,
    selected: !!types[t.key],
    leadingIcon: Icon(window.CAT[t.key].glyph, 15),
    onClick: () => setTypes(p => ({
      ...p,
      [t.key]: !p[t.key]
    }))
  }, t.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--text-primary)',
      marginBottom: 10
    }
  }, "Recent"), /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, [['94610 · 25 mi', 'Adams Point'], ['Alameda · 10 mi', 'Last weekend']].map(([a, b], i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    onClick: onSearch,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: '13px 16px',
      background: 'transparent',
      border: 'none',
      borderTop: i ? '1px solid var(--border-default)' : 'none',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, Icon('Clock', 18)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontWeight: 500,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, a), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, b)), Icon('ArrowUpLeft', 18, {
    stroke: 'var(--text-faint)'
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    leadingIcon: Icon('Search', 19),
    onClick: onSearch
  }, "Search this area"))));
}
window.SearchScreen = SearchScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/SearchScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/SettingsScreen.jsx
try { (() => {
/* SettingsScreen — account + preferences (grouped iOS list). */
function SettingsScreen({
  radiusMi
}) {
  const {
    Avatar,
    Card,
    ListRow,
    Switch,
    Badge
  } = window.RummageDesignSystem_019deb;
  const Icon = window.Icon;
  const [push, setPush] = React.useState(true);
  const [newSales, setNewSales] = React.useState(true);
  const [reminders, setReminders] = React.useState(true);
  const chev = Icon('ChevronRight', 18, {
    stroke: 'var(--text-faint)'
  });
  const GroupLabel = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    className: "rmg-eyebrow",
    style: {
      padding: '0 4px 8px',
      marginTop: 22
    }
  }, children);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflowY: 'auto',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--safe-top)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 20px 28px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 34,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)',
      lineHeight: 1.05,
      marginBottom: 16
    }
  }, "Account"), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Jordan Avery",
    size: 56
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      color: 'var(--text-primary)'
    }
  }, "Jordan Avery"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, Icon('MapPin', 13, {
    stroke: 'var(--accent)'
  }), " Home \xB7 94610")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--accent)'
    }
  }, "Edit"))), /*#__PURE__*/React.createElement(GroupLabel, null, "Search defaults"), /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(ListRow, {
    first: true,
    icon: Icon('MapPin', 18),
    label: "Home ZIP code",
    value: "94610",
    trailing: chev,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: Icon('Ruler', 18),
    label: "Default radius",
    value: `${radiusMi} mi`,
    trailing: chev,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: Icon('Tag', 18),
    label: "Sale types",
    value: "All",
    trailing: chev,
    onClick: () => {}
  })), /*#__PURE__*/React.createElement(GroupLabel, null, "Notifications"), /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(ListRow, {
    first: true,
    icon: Icon('Bell', 18),
    label: "Push notifications",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: push,
      onChange: setPush
    })
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: Icon('Sparkles', 18),
    label: "New sales nearby",
    sublabel: "Within your radius",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: newSales,
      onChange: setNewSales
    })
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: Icon('Clock', 18),
    label: "Sale reminders",
    sublabel: "1 hour before saved sales",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: reminders,
      onChange: setReminders
    })
  })), /*#__PURE__*/React.createElement(GroupLabel, null, "Support"), /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(ListRow, {
    first: true,
    icon: Icon('CircleHelp', 18),
    label: "Help & FAQ",
    trailing: chev,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: Icon('MessageSquare', 18),
    label: "Send feedback",
    trailing: chev,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: Icon('Shield', 18),
    label: "Privacy",
    trailing: chev,
    onClick: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(ListRow, {
    first: true,
    icon: Icon('LogOut', 18),
    label: "Sign out",
    danger: true,
    onClick: () => {}
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 18,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, "Rummage \xB7 v1.0.0")));
}
window.SettingsScreen = SettingsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ios_app/data.js
try { (() => {
/* Rummage iOS UI kit — shared fake data + helpers (plain JS, loaded before Babel screens). */
(function () {
  // Lucide IconNode -> inline SVG string. Returns a React span via window.Icon below.
  function svgString(name, size, opts) {
    opts = opts || {};
    const node = window.lucide && window.lucide.icons[name];
    if (!node) return '';
    const walk = m => {
      const tag = m[0],
        attrs = Object.assign({}, m[1] || {}),
        kids = m[2] || [];
      if (tag === 'svg') {
        attrs.width = size;
        attrs.height = size;
        if (opts.stroke) attrs.stroke = opts.stroke;
        if (opts.fill) attrs.fill = opts.fill;
        if (opts.sw) attrs['stroke-width'] = opts.sw;
      }
      return '<' + tag + ' ' + Object.entries(attrs).map(([k, v]) => k + '="' + v + '"').join(' ') + '>' + kids.map(walk).join('') + '</' + tag + '>';
    };
    return walk(node);
  }
  window.svgString = svgString;
  // React node icon helper.
  window.Icon = function (name, size, opts) {
    return window.React.createElement('span', {
      style: {
        display: 'inline-flex',
        flex: '0 0 auto'
      },
      dangerouslySetInnerHTML: {
        __html: svgString(name, size || 18, opts)
      }
    });
  };
  window.CAT = {
    estate: {
      label: 'Estate Sale',
      glyph: 'Armchair'
    },
    yard: {
      label: 'Yard Sale',
      glyph: 'Tent'
    },
    thrift: {
      label: 'Thrift Store',
      glyph: 'Store'
    },
    moving: {
      label: 'Moving Sale',
      glyph: 'Truck'
    },
    auction: {
      label: 'Auction',
      glyph: 'Gavel'
    }
  };

  // x/y are percentage positions on the faux map.
  window.SALES = [{
    id: 's1',
    type: 'estate',
    title: 'Mid-century estate, everything must go',
    address: '1247 Linden Ave, Oakland',
    neighborhood: 'Adams Point',
    distanceMi: 2.4,
    dateLabel: 'Sat, Jun 14',
    timeLabel: '8am–3pm',
    photoCount: 12,
    live: true,
    saved: true,
    x: 44,
    y: 38,
    host: 'Marin Estate Co.',
    price: '$1–$200',
    items: ['Teak credenza', 'Eames-style chairs', 'Vinyl records', 'Brass lamps', 'Vintage barware'],
    blurb: 'Full house of mid-century furniture, lighting, and decor. Forty years in one home — first come, first served. Cash and cards.'
  }, {
    id: 's2',
    type: 'yard',
    title: 'Multi-family block sale',
    address: 'Coolidge Ave, Fruitvale',
    neighborhood: 'Fruitvale',
    distanceMi: 1.1,
    dateLabel: 'Sun, Jun 15',
    timeLabel: '9am–2pm',
    photoCount: 5,
    live: false,
    saved: false,
    x: 62,
    y: 60,
    host: 'The Coolidge Block',
    price: 'Free–$40',
    items: ['Kids bikes', 'Books', 'Garden tools', 'Kitchenware'],
    blurb: 'Eight families, one long block. Tons of kids gear, books, plants, and odds and ends. Early birds welcome.'
  }, {
    id: 's3',
    type: 'auction',
    title: 'Estate auction — tools & fine art',
    address: '88 Grand Ave, Downtown',
    neighborhood: 'Downtown',
    distanceMi: 5.8,
    dateLabel: 'Thu, Jun 19',
    timeLabel: 'Preview 4pm · 6pm',
    photoCount: 24,
    live: false,
    saved: true,
    x: 30,
    y: 22,
    host: 'Grand Ave Auctions',
    price: 'Bid',
    items: ['Power tools', 'Oil paintings', 'Persian rugs', 'Sterling silver'],
    blurb: 'Live and online bidding. Preview opens at 4pm, lots close from 6pm. Buyer\'s premium 18%.'
  }, {
    id: 's4',
    type: 'thrift',
    title: 'Rerun Thrift — half-off weekend',
    address: '500 Telegraph Ave',
    neighborhood: 'Temescal',
    distanceMi: 3.2,
    dateLabel: 'Fri–Sun',
    timeLabel: '10am–7pm',
    photoCount: 8,
    live: true,
    saved: false,
    x: 52,
    y: 30,
    host: 'Rerun Thrift',
    price: '$2–$60',
    items: ['Denim', 'Records', 'Houseware', 'Coats'],
    blurb: 'Everything in the store is half off all weekend. New denim wall just dropped.'
  }, {
    id: 's5',
    type: 'moving',
    title: 'Loft moving sale — must clear by Sunday',
    address: '1900 Webster St',
    neighborhood: 'Uptown',
    distanceMi: 0.6,
    dateLabel: 'Sat–Sun',
    timeLabel: '11am–5pm',
    photoCount: 9,
    live: false,
    saved: false,
    x: 70,
    y: 44,
    host: 'Dana & Rob',
    price: '$5–$300',
    items: ['Sofa', 'Standing desk', 'Plants', 'Bar cart'],
    blurb: 'Moving cross-country. Furniture, plants, and kitchen — all priced to go. Make an offer on big items.'
  }, {
    id: 's6',
    type: 'yard',
    title: 'Garage sale — vintage cameras & vinyl',
    address: '77 Santa Clara Ave, Alameda',
    neighborhood: 'Alameda',
    distanceMi: 7.4,
    dateLabel: 'Sat, Jun 14',
    timeLabel: '8am–1pm',
    photoCount: 6,
    live: false,
    saved: false,
    x: 24,
    y: 66,
    host: 'Pete K.',
    price: '$1–$120',
    items: ['Film cameras', 'LPs', 'Receivers'],
    blurb: 'Decades of cameras, records, and audio gear. Serious collectors, come early.'
  }];
  window.FILTER_TYPES = [{
    key: 'estate',
    label: 'Estate'
  }, {
    key: 'yard',
    label: 'Yard sale'
  }, {
    key: 'thrift',
    label: 'Thrift'
  }, {
    key: 'moving',
    label: 'Moving'
  }, {
    key: 'auction',
    label: 'Auction'
  }];
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ios_app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.SaleCard = __ds_scope.SaleCard;

__ds_ns.SaleTypeTag = __ds_scope.SaleTypeTag;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.AppHeader = __ds_scope.AppHeader;

__ds_ns.DistanceStepper = __ds_scope.DistanceStepper;

__ds_ns.TabBar = __ds_scope.TabBar;

})();
