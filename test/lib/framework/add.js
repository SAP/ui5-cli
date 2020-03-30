const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");

const ui5Project = require("@ui5/project");

let addFramework;

test.beforeEach((t) => {
	t.context.generateDependencyTreeStub = sinon.stub(ui5Project.normalizer, "generateDependencyTree");
	t.context.processTreeStub = sinon.stub(ui5Project.projectPreprocessor, "processTree");
	t.context.Openui5GetLibraryMetadataStub = sinon.stub(
		ui5Project.ui5Framework.Openui5Resolver.prototype, "getLibraryMetadata");
	t.context.Sapui5GetLibraryMetadataStub = sinon.stub(
		ui5Project.ui5Framework.Sapui5Resolver.prototype, "getLibraryMetadata");

	t.context.updateYamlStub = sinon.stub();
	mock("../../../lib/framework/updateYaml", t.context.updateYamlStub);

	addFramework = mock.reRequire("../../../lib/framework/add");
});

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Add without existing libraries in config", async (t) => {
	const {generateDependencyTreeStub, processTreeStub,
		Openui5GetLibraryMetadataStub, updateYamlStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		},
		framework: {
			name: "OpenUI5",
			version: "1.76.0"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);
	Openui5GetLibraryMetadataStub.resolves();

	const {yamlUpdated} = await addFramework({
		normalizerOptions,
		libraries: ["sap.ui.lib1"]
	});

	t.true(yamlUpdated, "yamlUpdated should be true");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Openui5GetLibraryMetadataStub.callCount, 1, "Openui5Resolver.getLibraryMetadata should be called once");
	t.deepEqual(Openui5GetLibraryMetadataStub.getCall(0).args, ["sap.ui.lib1"],
		"Openui5Resolver.getLibraryMetadata should be called with expected args");

	t.is(updateYamlStub.callCount, 1, "updateYaml should be called once");
	t.deepEqual(updateYamlStub.getCall(0).args, [{
		project,
		data: {
			framework: {libraries: [{name: "sap.ui.lib1"}]}
		}
	}], "updateYaml should be called with expected args");
});


test.serial("Add with existing libraries in config", async (t) => {
	const {generateDependencyTreeStub, processTreeStub,
		Openui5GetLibraryMetadataStub, updateYamlStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		},
		framework: {
			name: "OpenUI5",
			version: "1.76.0",
			libraries: [{
				name: "sap.ui.lib2"
			}, {
				name: "sap.ui.lib1"
			}]
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);
	Openui5GetLibraryMetadataStub.resolves();

	const {yamlUpdated} = await addFramework({
		normalizerOptions,
		libraries: ["sap.ui.lib1", "sap.ui.lib3"]
	});

	t.true(yamlUpdated, "yamlUpdated should be true");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Openui5GetLibraryMetadataStub.callCount, 2, "Openui5Resolver.getLibraryMetadata should be called twice");
	t.deepEqual(Openui5GetLibraryMetadataStub.getCall(0).args, ["sap.ui.lib1"],
		"Openui5Resolver.getLibraryMetadata should be called with expected args on first call");
	t.deepEqual(Openui5GetLibraryMetadataStub.getCall(1).args, ["sap.ui.lib3"],
		"Openui5Resolver.getLibraryMetadata should be called with expected args on second call");

	t.is(updateYamlStub.callCount, 1, "updateYaml should be called once");
	t.deepEqual(updateYamlStub.getCall(0).args, [{
		project,
		data: {
			framework: {
				libraries: [
					{name: "sap.ui.lib1"},
					{name: "sap.ui.lib2"},
					{name: "sap.ui.lib3"}
				]
			}
		}
	}], "updateYaml should be called with expected args");
});
