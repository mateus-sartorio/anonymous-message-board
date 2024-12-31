'use strict';

const crypto = require("crypto");
const { ObjectId } = require("mongodb");

function getDbCollections(dbClient, isTest) {
  const dbName = isTest ? "anonymous-message-board-test" : "anonymous-message-board";
        
  const database = dbClient.db(dbName);

  const threadsCollection = database.collection("thread");
  const repliesCollection = database.collection("replies");

  return { threadsCollection, repliesCollection };
}

module.exports = function (app, dbClient) {
  app
    .route('/api/threads/:board')
    .get(async (req, res) => {
      const { board } = req.params;

      const isTest = req.header("test");
      const { threadsCollection, repliesCollection } = getDbCollections(dbClient, isTest);

      const threadsResponse = await threadsCollection
        .find({ board })
        .sort({ createdOn: -1 })
        .toArray();

      const repliesResponses = await Promise.all(threadsResponse.map(tr => {
        const threadId = new ObjectId(tr._id);

        return repliesCollection
          .find({ threadId })
          .sort({ createdOn: -1 })
          .toArray();
        })
      );

      const responsePayload = threadsResponse.map((thread, index) => ({
        _id: thread._id,
        text: thread.text,
        created_on: thread.createdOn,
        bumped_on: thread.updatedOn,
        replies: repliesResponses[index].map(reply => ({
          _id: reply._id,
          text: reply.text,
          created_on: reply.createdOn,
        })),
        replycount: repliesResponses[index].length
      }));

      res.status(200).json(responsePayload);
    })
    .post(async (req, res) => {
      const { board } = req.params;
      const { text, delete_password } = req.body;

      const isTest = req.header("test");
      const { threadsCollection } = getDbCollections(dbClient, isTest);

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      await threadsCollection.insertOne({
        board,
        text,
        deletePasswordHashed,
        createdOn: new Date(),
        updatedOn: new Date(),
        reportCount: 0
      });

      res.status(302).redirect(`/b/${board}/`);
    })
    .put(async (req, res) => {
      const isTest = req.header("test");
      const { threadsCollection } = getDbCollections(dbClient, isTest);
      
      const { thread_id } = req.body;

      const threadId = new ObjectId(thread_id);

      await threadsCollection.updateOne(
        {
          _id: threadId,
        },
        {
          updatedOn: new Date(),
          $inc: {
            reportCount: 1
          }
        }
      );

      res.status(200).send("reported");
    })
    .delete(async (req, res) => {
      const { board, thread_id, delete_password } = req.body;

      const isTest = req.header("test");
      const { threadsCollection, repliesCollection } = getDbCollections(dbClient, isTest);

      const threadId = new ObjectId(thread_id);

      const thread = await threadsCollection.findOne({ _id: threadId });

      if(!thread) {
        res.status(502).end();
        return;
      }

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      if(deletePasswordHashed === thread.deletePasswordHashed) {
        await Promise.all([ threadsCollection.deleteOne({ _id: threadId }), repliesCollection.deleteMany({ threadId }) ]);
      }
      else {
        res.status(200).send("incorrect password");
        return;
      }

      res.status(200).send("success");
    });
    
  app
    .route('/api/replies/:board')
    .get(async (req, res) => {
      const { thread_id } = req.query;

      const threadId = new ObjectId(thread_id);

      const isTest = req.header("test");
      const { threadsCollection, repliesCollection } = getDbCollections(dbClient, isTest);

      const threadResponse = await threadsCollection.findOne({ _id: threadId });

      const repliesResponse = await repliesCollection
        .find({ threadId })
        .sort({ createdOn: -1 })
        .toArray();

      const responsePayload = {
        _id: threadResponse._id,
        text: threadResponse.text,
        created_on: threadResponse.createdOn,
        bumped_on: threadResponse.updatedOn,
        replies: repliesResponse.map(reply => ({
          _id: reply._id,
          text: reply.text,
          created_on: reply.createdOn,
        }))
      };
      
      res.status(200).json(responsePayload);
    })
    .post(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;

      const isTest = req.header("test");
      const { threadsCollection, repliesCollection } = getDbCollections(dbClient, isTest);

      const threadId = new ObjectId(thread_id);

      const thread = await threadsCollection.findOne({ _id: threadId });

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      await repliesCollection.insertOne({
        threadId,
        board: thread.board,
        text,
        createdOn: new Date(),
        updatedOn: new Date(),
        deletePasswordHashed,
        reportCount: 0
      });

      res.status(302).redirect(`/b/${thread.board}/${thread_id}`);
    })
    .put(async (req, res) => {
      const { reply_id } = req.body;

      const replyId = new ObjectId(reply_id);

      const isTest = req.header("test");
      const { repliesCollection } = getDbCollections(dbClient, isTest);

      await repliesCollection.updateOne(
        {
          _id: replyId,
        },
        {
          updatedOn: new Date(),
          $inc: {
            reportCount: 1
          }
        }
      );

      res.status(200).send("reported");
    })
    .delete(async (req, res) => {
      const { reply_id, delete_password } = req.body;

      const isTest = req.header("test");
      const { repliesCollection } = getDbCollections(dbClient, isTest);

      const replyId = new ObjectId(reply_id);

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      const reply = await repliesCollection.findOne({ _id: replyId });

      if(deletePasswordHashed === reply.deletePasswordHashed) {
        await repliesCollection.deleteOne({ _id: replyId });
      }
      else {
        res.status(200).send("incorrect password");
        return;
      }

      res.status(200).send("success");
    });
};