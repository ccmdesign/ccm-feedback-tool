import { describe, expect, it } from "vitest";
import { CCM_FEEDBACK_MODELS } from "../src/schema.js";
import { FEEDBACK_TYPES, REPLY_SOURCES } from "../src/types.js";

describe("CCM-290 — feedback type, reply model, project agent token", () => {
  it("FEEDBACK_TYPES includes 'comment' as first-class member", () => {
    expect(FEEDBACK_TYPES).toContain("comment");
  });

  it("FEEDBACK_TYPES preserves the original four types (no removal)", () => {
    for (const t of ["question", "change", "bug", "other"]) {
      expect(FEEDBACK_TYPES).toContain(t);
    }
  });

  it("REPLY_SOURCES exposes the two allowed reply origins", () => {
    expect(REPLY_SOURCES).toEqual(["user", "agent"]);
  });

  it("Project has an optional plaintext agentToken column", () => {
    const { fields } = CCM_FEEDBACK_MODELS.Project;
    expect(fields.agentToken).toBeDefined();
    expect(fields.agentToken.type).toBe("String");
    expect(fields.agentToken.optional).toBe(true);
  });

  it("FeedbackItem has a 1-to-many replies back-relation", () => {
    const { fields } = CCM_FEEDBACK_MODELS.FeedbackItem;
    expect(fields.replies).toBeDefined();
    const rel = fields.replies.relation;
    expect(rel).toBeDefined();
    expect(rel!.kind).toBe("1-to-many");
    expect(rel!.model).toBe("FeedbackReply");
  });

  it("FeedbackReply model exists with all expected fields", () => {
    const model = CCM_FEEDBACK_MODELS.FeedbackReply;
    expect(model).toBeDefined();
    const expected = ["id", "feedbackId", "feedback", "source", "author", "authorEmail", "body", "createdAt"];
    for (const name of expected) {
      expect(model.fields, `missing ${name}`).toHaveProperty(name);
    }
  });

  it("FeedbackReply.id is a cuid() String primary key", () => {
    const { id } = CCM_FEEDBACK_MODELS.FeedbackReply.fields;
    expect(id.type).toBe("String");
    expect(id.isId).toBe(true);
    expect(id.default).toBe("cuid()");
  });

  it("FeedbackReply.feedback cascades on parent delete", () => {
    const rel = CCM_FEEDBACK_MODELS.FeedbackReply.fields.feedback.relation;
    expect(rel).toBeDefined();
    expect(rel!.kind).toBe("many-to-1");
    expect(rel!.model).toBe("FeedbackItem");
    expect(rel!.onDelete).toBe("Cascade");
  });

  it("FeedbackReply.body uses nativeType Text for long-content portability", () => {
    const { body } = CCM_FEEDBACK_MODELS.FeedbackReply.fields;
    expect(body.type).toBe("String");
    expect(body.nativeType).toBe("Text");
  });

  it("FeedbackReply.authorEmail is optional", () => {
    expect(CCM_FEEDBACK_MODELS.FeedbackReply.fields.authorEmail.optional).toBe(true);
  });

  it("FeedbackReply indexes the feedbackId lookup", () => {
    const model = CCM_FEEDBACK_MODELS.FeedbackReply;
    const hasIdx = model.indexes?.some((idx) => idx.fields.length === 1 && idx.fields[0] === "feedbackId");
    expect(hasIdx).toBe(true);
  });
});
