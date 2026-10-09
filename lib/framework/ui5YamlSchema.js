import {CORE_SCHEMA, mergeTag, timestampTag} from "js-yaml";

// Preserve merge keys and implicit timestamps from the js-yaml v4 default schema.
export default CORE_SCHEMA.withTags([mergeTag, timestampTag]);
