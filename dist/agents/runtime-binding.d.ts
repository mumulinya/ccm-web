/** Runtime binding facade. Third-party sessions remain replaceable execution backends. */
export { type RuntimeBinding, bindRuntimeSession, listRuntimeBindings, replaceRuntimeSession, updateRuntimeBinding, } from "./execution-session-registry";
