"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageWindow = pageWindow;
function pageWindow(page = 1, pageSize = 20) {
    return { skip: (page - 1) * pageSize, take: pageSize };
}
//# sourceMappingURL=pagination.js.map