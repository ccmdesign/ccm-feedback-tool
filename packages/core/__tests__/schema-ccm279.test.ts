import { describe, expect, it } from "vitest";
import { CCM_FEEDBACK_MODELS } from "../src/schema.js";

describe("CCM-279 schema additions", () => {
  it("has the Project, ReviewBatch models", () => {
    expect(CCM_FEEDBACK_MODELS).toHaveProperty("Project");
    expect(CCM_FEEDBACK_MODELS).toHaveProperty("ReviewBatch");
  });

  it("no model name contains 'Siteping' (regression guard from CCM-277)", () => {
    for (const name of Object.keys(CCM_FEEDBACK_MODELS)) {
      expect(name.toLowerCase().includes("siteping")).toBe(false);
    }
  });

  describe("Project", () => {
    const project = CCM_FEEDBACK_MODELS.Project;

    it("id is @id with cuid() default", () => {
      expect(project.fields.id.isId).toBe(true);
      expect(project.fields.id.default).toBe("cuid()");
    });

    it("name is unique (enables backfill upsert)", () => {
      expect(project.fields.name.isUnique).toBe(true);
    });

    it("webhook URL + secret hash are optional (projects can exist without webhook)", () => {
      expect(project.fields.implementationWebhookUrl.optional).toBe(true);
      expect(project.fields.implementationWebhookSecretHash.optional).toBe(true);
    });

    it("has reverse relations to FeedbackItem and ReviewBatch", () => {
      expect(project.fields.feedbacks.relation?.kind).toBe("1-to-many");
      expect(project.fields.feedbacks.relation?.model).toBe("FeedbackItem");
      expect(project.fields.reviewBatches.relation?.kind).toBe("1-to-many");
      expect(project.fields.reviewBatches.relation?.model).toBe("ReviewBatch");
    });
  });

  describe("ReviewBatch", () => {
    const rb = CCM_FEEDBACK_MODELS.ReviewBatch;

    it("project FK uses Cascade delete", () => {
      const rel = rb.fields.project.relation;
      expect(rel?.model).toBe("Project");
      expect(rel?.onDelete).toBe("Cascade");
    });

    it("dispatchStatus defaults to 'pending'", () => {
      expect(rb.fields.dispatchStatus.default).toBe('"pending"');
    });

    it("dispatchAttempts defaults to 0", () => {
      expect(rb.fields.dispatchAttempts.default).toBe("0");
    });

    it("annotationIds is a list (Postgres array)", () => {
      expect(rb.fields.annotationIds.type).toBe("String");
      expect(rb.fields.annotationIds.isList).toBe(true);
    });

    it("has index on dispatchStatus,nextAttemptAt for scheduled runner", () => {
      const found = rb.indexes?.find((idx) => idx.fields.length === 2 && idx.fields[0] === "dispatchStatus");
      expect(found).toBeDefined();
    });
  });

  describe("FeedbackAnnotation CCM-279 additions", () => {
    const ann = CCM_FEEDBACK_MODELS.FeedbackAnnotation;

    it("status defaults to 'submitted'", () => {
      expect(ann.fields.status.type).toBe("String");
      expect(ann.fields.status.default).toBe('"submitted"');
    });

    it("implementationResult is an optional Json field", () => {
      expect(ann.fields.implementationResult.type).toBe("Json");
      expect(ann.fields.implementationResult.optional).toBe(true);
    });

    it("implementationUpdatedAt is an optional DateTime", () => {
      expect(ann.fields.implementationUpdatedAt.type).toBe("DateTime");
      expect(ann.fields.implementationUpdatedAt.optional).toBe(true);
    });
  });

  describe("FeedbackItem CCM-279 additions", () => {
    const item = CCM_FEEDBACK_MODELS.FeedbackItem;

    it("projectId is optional for this PR (migration window)", () => {
      expect(item.fields.projectId.optional).toBe(true);
      expect(item.fields.projectId.type).toBe("String");
    });

    it("projectName remains required (not dropped in this PR)", () => {
      expect(item.fields.projectName.type).toBe("String");
      expect(item.fields.projectName.optional).toBeUndefined();
    });

    it("project relation uses SetNull on delete (preserves feedback)", () => {
      const rel = item.fields.project.relation;
      expect(rel?.onDelete).toBe("SetNull");
    });
  });
});
