'use strict';

const crypto = require("crypto");
const { BoardModel, ThreadModel, ReplyModel } = require("../models");

module.exports = function (app) {
  app
    .route('/api/threads/:board')
    .get(async (req, res) => {
      const { board } = req.params;

      const dbBoard = await BoardModel.findOne({ name: board });

      const threads = dbBoard.threads.map(thread => ({
        ...thread,
        replycount: thread.replies.length
      }));

      res.json(threads);
    })
    .post(async (req, res) => {
      const { board: urlBoard } = req.params;
      const { board: bodyBoard, text, delete_password } = req.body;

      const board = bodyBoard ?? urlBoard;

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      const newThread = new ThreadModel({
        text,
        delete_password: deletePasswordHashed,
        replies: []
      });

      const dbBoard = await BoardModel.findOne({ name: board });

      if(!dbBoard) {
        const newBoard = new BoardModel({
          name: board,
          threads: [ newThread ]
        });

        await newBoard.save();
      }
      else {
        dbBoard.threads.push(newThread);
        await dbBoard.save();
      }

      res.json(newThread);
    })
    .put(async (req, res) => {
      const { board } = req.params;
      const { report_id } = req.body;
      
      const dbBoard = await BoardModel.findOne({ name: board });

      const reportedThread = dbBoard.threads.id(report_id);
      reportedThread.reported = true;
      reportedThread.bumped_on = new Date();

      await dbBoard.save();

      res.send("reported");
    })
    .delete(async (req, res) => {
      const { board: urlBoard } = req.params;
      const { board: bodyBoard, thread_id, delete_password } = req.body;

      const board = bodyBoard ?? urlBoard;

      const dbBoard = await BoardModel.findOne({ name: board });

      const threadToDelete = dbBoard.threads.id(thread_id);

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      if(deletePasswordHashed === threadToDelete.delete_password) {
        await threadToDelete.remove()
      }
      else {
        res.send("incorrect password");
        return;
      }

      dbBoard.save();

      res.send("success");
    });
    
  app
    .route('/api/replies/:board')
    .get(async (req, res) => {
      const { board } = req.params;
      const { thread_id } = req.query;

      const dbBoard = await BoardModel.findOne({ name: board });

      const thread = dbBoard.threads.id(thread_id);

      res.json(thread);
    })
    .post(async (req, res) => {
      const { board } = req.params;
      const { thread_id, text, delete_password } = req.body;

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      const newReply = new ReplyModel({
        text,
        delete_password: deletePasswordHashed
      });
      
      const dbBoard = await BoardModel.findOne({ name: board });

      const threadToAddReply = dbBoard.threads.id(thread_id);
      threadToAddReply.bumped_on = new Date();
      threadToAddReply.replies.push(newReply);

      const result = await dbBoard.save();

      res.json(result);
    })
    .put(async (req, res) => {
      const { board } = req.params;
      const { thread_id, reply_id } = req.body;

      const dbBoard = await BoardModel.findOne({ name: board });
      const thread = dbBoard.threads.id(thread_id);
      const reply = thread.replies.id(reply_id);

      reply.reported = true;
      reply.bumped_on = new Date();

      dbBoard.save();

      res.send("reported");
    })
    .delete(async (req, res) => {
      const { board } = req.params;
      const { thread_id, reply_id, delete_password } = req.body;

      const dbBoard = await BoardModel.findOne({ name: board });
      const thread = dbBoard.threads.id(thread_id);
      const reply = thread.replies.id(reply_id);

      const deletePasswordHashed = crypto.createHash('md5').update(delete_password).digest('hex');

      if(deletePasswordHashed === reply.delete_password) {
        reply.remove();
      }
      else {
        res.send("incorrect password");
        return;
      }

      res.send("success");
    });
};