const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");

const useFramework = require("../../../../lib/framework/use");

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.skip("TODO", (t) => {

});
