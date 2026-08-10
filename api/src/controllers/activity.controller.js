import { ActivityEvent } from "../models/activity-event.model.js";

export const recordPageView = async (req, res) => {
  const page = String(req.body.page ?? "home").trim() || "home";
  const visitorId = String(req.body.visitorId ?? "").trim();

  await ActivityEvent.create({
    type: "page_view",
    page,
    visitorId,
    authenticated: Boolean(req.user),
    user: req.user?.id
  });

  res.status(204).end();
};
