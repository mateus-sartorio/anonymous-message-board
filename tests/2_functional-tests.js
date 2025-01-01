const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

function getRandomInteger(n) {
  return Math.floor(Math.random() * Number(n)) + 1;
}

function isSortedByBumpedOnDescending(array, property) {
  for (let i = 0; i < array.length - 1; i++) {
    if (new Date(array[i][property]) < new Date(array[i + 1].bumped_on)) {
      return false;
    }
  }
  return true;
}

const BOARD = `test${getRandomInteger(1000000)}`
const DELETE_PASSWORD = `delete_me_${getRandomInteger(1000000)}`;

suite('Functional Tests', function() {  
  test("Creating a new thread: POST request to /api/threads/{board}", function (done) {
    const input = {
      delete_password: DELETE_PASSWORD,
      text: "test",
      board: BOARD
    };
    
    chai
      .request(server)
      .keepOpen()
      .post(`/api/threads/${BOARD}`)
      .send(input)
      .end((_err, res) => {
        assert.equal(res.status, 200);

        chai
          .request(server)
          .keepOpen()
          .get(`/api/threads/${BOARD}`)
          .end((_err, secondResponse) => {
            assert.equal(secondResponse.status, 200);

            const output = secondResponse.body;

            assert.isArray(output);

            output.forEach(thread => {
              assert.property(thread, '_id');

              assert.property(thread, 'text');
              assert.strictEqual(thread.text, input.text);

              assert.property(thread, 'created_on');
              assert.property(thread, 'bumped_on');
              assert.strictEqual(thread.created_on, thread.bumped_on);

              assert.isArray(thread.replies);
            });
    
            done();
          });
      });
  });

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", function (done) {
    const input = {
      delete_password: "test",
      text: "test",
      board: BOARD
    };

    chai
      .request(server)
      .keepOpen()
      .get(`/api/threads/${BOARD}`)
      .end((_err, secondResponse) => {
        assert.equal(secondResponse.status, 200);

        const output = secondResponse.body;

        assert.isArray(output);
        assert.isAtMost(output.length, 10);
        assert.isTrue(isSortedByBumpedOnDescending(output), "bumped_on");

        output.forEach(thread => {
          assert.property(thread, '_id');

          assert.property(thread, 'text');
          assert.strictEqual(thread.text, input.text);

          assert.property(thread, 'created_on');
          assert.property(thread, 'bumped_on');
          assert.strictEqual(thread.created_on, thread.bumped_on);

          assert.isArray(thread.replies);
          assert.isAtMost(thread.replies.length, 3);
          assert.isTrue(isSortedByBumpedOnDescending(thread.replies, "created_on"));
        });

        done();
      });
  });

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get(`/api/threads/${BOARD}`)
      .end((_err, secondResponse) => {
        assert.equal(secondResponse.status, 200);

        const output = secondResponse.body;

        thread_id = output[0]._id;

        const input = {
          board: BOARD,
          thread_id,
          delete_password: "wrong_password",
        };

        chai
          .request(server)
          .keepOpen()
          .delete(`/api/threads/${BOARD}`)
          .send(input)
          .end((_err, secondResponse) => {
            assert.equal(secondResponse.status, 200);
    
            const output = secondResponse.text;
    
            assert.strictEqual(output, "incorrect password");
  
            done();
          });
      });

  });

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get(`/api/threads/${BOARD}`)
      .end((_err, secondResponse) => {
        assert.equal(secondResponse.status, 200);

        const output = secondResponse.body;

        thread_id = output[0]._id;

        const input = {
          board: BOARD,
          thread_id,
          delete_password: DELETE_PASSWORD,
        };

        chai
          .request(server)
          .keepOpen()
          .delete(`/api/threads/${BOARD}`)
          .send(input)
          .end((_err, secondResponse) => {
            assert.equal(secondResponse.status, 200);
    
            const output = secondResponse.text;
    
            assert.strictEqual(output, "success");
  
            done();
          });
      });

  });

  test("Reporting a thread: PUT request to /api/threads/{board}", function (done) {
    const input = {
      delete_password: DELETE_PASSWORD,
      text: "test",
      board: BOARD
    };
    
    chai
      .request(server)
      .keepOpen()
      .post(`/api/threads/${BOARD}`)
      .send(input)
      .end((_err, res) => {
        assert.equal(res.status, 200);

        chai
          .request(server)
          .keepOpen()
          .get(`/api/threads/${BOARD}`)
          .end((_err, secondResponse) => {
            assert.equal(secondResponse.status, 200);
    
            const output = secondResponse.body;
    
            thread_id = output[0]._id;
    
            const input = {
              board: BOARD,
              thread_id,
            };
    
            chai
              .request(server)
              .keepOpen()
              .put(`/api/threads/${BOARD}`)
              .send(input)
              .end((_err, secondResponse) => {
                assert.equal(secondResponse.status, 200);
        
                const output = secondResponse.text;
        
                assert.strictEqual(output, "reported");
      
                done();
              });
          });
      });
  });

  test("Creating a new reply: POST request to /api/replies/{board}", function (done) {
    const input = {
      delete_password: DELETE_PASSWORD,
      text: "test",
      board: BOARD
    };
    
    chai
      .request(server)
      .keepOpen()
      .post(`/api/replies/${BOARD}`)
      .send(input)
      .end((_err, res) => {
        assert.equal(res.status, 200);

        chai
          .request(server)
          .keepOpen()
          .get(`/api/replies/${BOARD}`)
          .end((_err, secondResponse) => {
            assert.equal(secondResponse.status, 200);

            const output = secondResponse.body;

            assert.isArray(output);

            output.forEach(thread => {
              assert.property(thread, '_id');

              assert.property(thread, 'text');
              assert.strictEqual(thread.text, input.text);

              assert.property(thread, 'created_on');
              assert.property(thread, 'bumped_on');
              assert.strictEqual(thread.created_on, thread.bumped_on);

              assert.isArray(thread.replies);
            });
    
            done();
          });
      });
  });
});
