// Behavior-freeze facade — implementation split into focused modules.
import { handleCollaborationApiIntakeRoutesPartA } from "./collaboration-routes-part-02-part-01";
import { handleCollaborationApiIntakeRoutesPartB } from "./collaboration-routes-part-02-part-02";

export { handleCollaborationApiIntakeRoutesPartA, handleCollaborationApiIntakeRoutesPartB };

export function handleCollaborationApiIntakeRoutes(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: any,
): boolean {
  if (handleCollaborationApiIntakeRoutesPartA(pathname, req, res, parsed, ctx)) return true;
  return handleCollaborationApiIntakeRoutesPartB(pathname, req, res, parsed, ctx);
}
