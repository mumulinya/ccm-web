"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelTokenMeasurementForPersistence = modelTokenMeasurementForPersistence;
/** Usage records retain accounting, never the model's source/prompt body. */
function modelTokenMeasurementForPersistence(measurement) {
    if (!measurement?.modelVisiblePayload)
        return measurement;
    return { ...measurement, modelVisiblePayload: require('./session-compaction-core').modelVisiblePayloadAccounting(measurement.modelVisiblePayload) };
}
//# sourceMappingURL=model-visible-measurement-privacy.js.map