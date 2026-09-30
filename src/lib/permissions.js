// lib/permissions.js
//
// Single place for "who can do what". Change a rule here and it applies
// everywhere (login, routing, nav, Data Entry, Post page).
//
//   IPF  -> fills POST data      (any post that is NOT an "-OP" code)
//   SI   -> fills OP data        (codes ending in "-OP", e.g. ALU-OP)
//   ASC / Sr DSC -> the ONLY roles that can correct an entry after it is sent
//   Everyone else (DSC, ASI, DI) -> view only on the Post page

export const AUTHORITIES = ["Sr DSC", "DSC", "ASC", "IPF", "SI", "ASI", "DI", "TEST"];
// What a person may ask for on the Request Access form (TEST is only ever
// assigned by Sr DSC on the Approvals page).
export const REQUESTABLE_AUTHORITIES = ["IPF", "SI", "ASI", "ASC", "DSC", "DI", "Sr DSC"];
export const CORRECT_AUTHORITIES = ["ASC", "Sr DSC"];

// TEST = temporary all-access account (fill any post/OP, correct, dashboard,
// Add Post). Remove "TEST" from here (and AUTHORITIES) when testing is done.
export const FULL_ACCESS_AUTHORITIES = ["TEST"];
export const isFullAccess = (profile) =>
  !!profile && FULL_ACCESS_AUTHORITIES.includes(profile.authority);

// Can this session open the Add Post / Manage Posts page?
export const canManagePosts = (profile) =>
  !!profile && (profile.authority === "Sr DSC" || isFullAccess(profile));

export const isOpPost = (code) => /-OP$/i.test((code || "").trim());

// Which posts an authority may pick at login.
export function postsForAuthority(authority, allPosts) {
  const real = allPosts.filter((p) => p !== "All Post");
  if (authority === "IPF") return real.filter((p) => !isOpPost(p));
  if (authority === "SI") return real.filter(isOpPost);
  return allPosts;
}

// Can this session ENTER data (plan + closure update) for its own post?
export function canFill(profile) {
  if (isFullAccess(profile)) return true;
  if (!profile || !profile.post || profile.post === "All Post") return false;
  if (profile.authority === "IPF") return !isOpPost(profile.post);
  if (profile.authority === "SI") return isOpPost(profile.post);
  return false;
}

// Can this session CORRECT an entry that has already been sent?
export const canCorrect = (profile) =>
  !!profile && (isFullAccess(profile) || CORRECT_AUTHORITIES.includes(profile.authority));

// Landing page after login / when a route is not allowed.
export const homePath = (profile) => (canFill(profile) ? "/data-entry" : "/post");