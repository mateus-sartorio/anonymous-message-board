'use strict';

const { Board, Thread, Reply } = require("../models");

module.exports = function (app) {
  app
    .route('/api/threads/:board')
    .get(async (req, res) => {
      const { board } = req.params;

      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        res.send("error");
        return;
      }

      dbBoard.reported = undefined;
      dbBoard.delete_password = undefined;

      const threads = dbBoard.threads.map(thread => ({
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies
          .map(r => {
            r.reported = undefined;
            r.delete_password = undefined;
            return r;
          })
          .sort((a, b) => new Date(b.created_on) - new Date(a.created_on))
          .slice(0, 3),
        replycount: thread.replies.length
      }))
      .sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on))
      .slice(0, 10);

      res.json(threads);
    })
    .post(async (req, res) => {
      const { board: urlBoard } = req.params;
      const { board: bodyBoard, text, delete_password } = req.body;

      const board = bodyBoard ?? urlBoard;

      const currentDate = new Date();

      const newThread = new Thread({
        text,
        delete_password,
        replies: [],
        created_on: currentDate,
        bumped_on: currentDate
      });

      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        const newBoard = new Board({
          name: board,
          threads: [ newThread ],
          created_on: currentDate,
          bumped_on: currentDate
        });

        try {
          await newBoard.save();
        }
        catch(e) {
          res.send("error");
          return;
        }
      }
      else {
        dbBoard.threads.push(newThread);

        try {
          await dbBoard.save();
        }
        catch(e) {
          res.send("error");
          return;
        }
      }

      res.redirect(`/b/${board}`);
    })
    .put(async (req, res) => {
      const { board } = req.params;
      const { report_id } = req.body;
      
      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        res.send("error");
        return;
      }

      const reportedThread = dbBoard.threads.id(report_id);
      reportedThread.reported = true;
      reportedThread.bumped_on = new Date();

      try {
        await dbBoard.save();
      }
      catch(e) {
        res.send("error");
        return;
      }

      res.send("reported");
    })
    .delete(async (req, res) => {
      const { board: urlBoard } = req.params;
      const { board: bodyBoard, thread_id, delete_password } = req.body;

      const board = bodyBoard ?? urlBoard;

      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        res.send("error");
        return;
      }

      const threadToDelete = dbBoard.threads.id(thread_id);

      if(delete_password === threadToDelete.delete_password) {
        try {
          dbBoard.threads.pull(thread_id);
        }
        catch(e) {
          res.send("error");
          return;
        }
      }
      else {
        res.send("incorrect password");
        return;
      }

      try {
        await dbBoard.save();
      }
      catch(e) {
        res.send("error");
        return;
      }

      res.send("success");
    });
    
  app
    .route('/api/replies/:board')
    .get(async (req, res) => {
      const { board } = req.params;
      const { thread_id } = req.query;

      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        res.send("error");
        return;
      }

      const thread = dbBoard.threads.id(thread_id)  ;

      if(!thread) {
        res.send("error");
        return;
      }

      thread.replies = thread.replies
        .map(r => {
          r.delete_password = undefined;
          r.reported = undefined;

          return r;
        })
        .sort((a, b) => new Date(b.created_on) - new Date(a.created_on));

      thread.delete_password = undefined;
      thread.reported = undefined;

      res.json(thread);
    })
    .post(async (req, res) => {
      const { board } = req.params;
      const { thread_id, text, delete_password } = req.body;

      const currentDate = new Date();

      const newReply = new Reply({
        text,
        delete_password,
        created_on: currentDate,
        bumped_on: currentDate
      });
      
      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        res.send("error");
        return;
      }

      const threadToAddReply = dbBoard.threads.id(thread_id);

      if(!threadToAddReply) {
        res.send("error");
        return;
      }

      threadToAddReply.bumped_on = currentDate;
      threadToAddReply.replies.push(newReply);

      try {
        await dbBoard.save();
        res.redirect(`/b/${board}/${thread_id}`);
      }
      catch(e) {
        res.send("error");
        return;
      }
    })
    .put(async (req, res) => {
      const { board } = req.params;
      const { thread_id, reply_id } = req.body;

      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        res.send("error");
        return;
      }

      const thread = dbBoard.threads.id(thread_id);
      const reply = thread.replies.id(reply_id);

      reply.reported = true;
      reply.bumped_on = new Date();

      try {
        await dbBoard.save();
      }
      catch(e) {
        res.send("error");
        return;
      }

      res.send("reported");
    })
    .delete(async (req, res) => {
      const { board } = req.params;
      const { thread_id, reply_id, delete_password } = req.body;

      const dbBoard = await Board.findOne({ name: board });

      if(!dbBoard) {
        res.send("error");
        return;
      }

      const thread = dbBoard.threads.id(thread_id);
      const reply = thread.replies.id(reply_id);

      if(delete_password === reply.delete_password) {
        try {
          await reply.remove();
        }
        catch(e) {
          res.send("error");
          return;
        }
      }
      else {
        res.send("incorrect password");
        return;
      }

      res.send("success");
    });
};