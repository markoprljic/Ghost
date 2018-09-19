const contentKeyAuth = require('../../../../../server/services/auth/api-key/content');
const models = require('../../../../../server/models');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const {
    BadRequestError,
    UnauthorizedError
} = require('../../../../../server/lib/common/errors');

const sandbox = sinon.sandbox.create();

describe('Content API Key Auth', function () {
    before(models.init);
    before(testUtils.teardown);

    this.beforeEach(function () {
        const fakeApiKey = {
            id: '1234',
            type: 'content',
            secret: Buffer.from('testing').toString('hex'),
            get(prop) {
                return this[prop];
            }
        };
        this.fakeApiKey = fakeApiKey;

        this.apiKeyStub = sandbox.stub(models.ApiKey, 'findOne');
        this.apiKeyStub.returns(new Promise.resolve());
        this.apiKeyStub.withArgs({secret: fakeApiKey.secret}).returns(new Promise.resolve(fakeApiKey));
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should authenticate with known+valid key', function (done) {
        const req = {
            query: {
                content_key: this.fakeApiKey.secret
            }
        };
        const res = {};

        contentKeyAuth.authenticateContentAPIKey(req, res, (arg) => {
            should.not.exist(arg);
            req.api_key.should.eql(this.fakeApiKey);
            done();
        });
    });

    it('shouldn\'t authenticate with Authorization header', function (done) {
        const req = {
            headers: {
                authorization: 'Bearer xxx'
            },
            query: {
                content_key: this.fakeApiKey.secret
            }
        };
        const res = {};

        contentKeyAuth.authenticateContentAPIKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof BadRequestError, true);
            err.message.should.match(/does not support header authentication/);
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with invalid/unknown key', function (done) {
        const req = {
            query: {
                content_key: 'unknown'
            }
        };
        const res = {};

        contentKeyAuth.authenticateContentAPIKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof UnauthorizedError, true);
            err.message.should.match(/Unknown Content API Key/);
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with a non-content-api key', function (done) {
        const req = {
            query: {
                content_key: this.fakeApiKey.secret
            }
        };
        const res = {};

        this.fakeApiKey.type = 'admin';

        contentKeyAuth.authenticateContentAPIKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof UnauthorizedError, true);
            err.message.should.match(/Incorrect API Key type/);
            should.not.exist(req.api_key);
            done();
        });
    });
});