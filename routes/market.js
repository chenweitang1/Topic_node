const dayjs = require('dayjs')//時間格式
const express = require('express'); //express引入
const { now } = require('moment');//時間格式-有時區
const db = require(__dirname + '/../modules/mysql2')//__dirname 表當前執行檔案位置  用途:當前執行檔案連結資料庫
const router = express.Router() //express內建route功能 [get、post、put、delete]
const upload = require(__dirname + '/../modules/img-upload');//引導到圖片上傳的檔案
const multipartParser = upload.none();
const moment = require('moment-timezone');
//寫入 時間用 currentDateTime
const date = new Date

const currentDateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
//token驗證
// if(! res.locals.jwtData){
//    output.error = '沒有 token 驗證'
//    return res.json(output);
//  }else{
//    output.jwtData=res.locals.jwtData
//  }



//關鍵字搜尋(未完成)
router.get("/", async (req, res) => {  //處理GET請求時執行async
   let output = {
      redirect: "", //重新導向
      totalRows: 0, //表示
      perPage: 25, //每頁顯示25筆資料
      totalPages: 0, //總頁數
      page: 1, //目前頁數
      rows: [], //空陣列 用於存放內容
   };
   const perPage = 16;   //處理分頁與關鍵字搜尋
   let keyword = req.query.keyword || ""; //設置關鍵字變數,req.query.keyword  reqeust物件的方法 取得get方法的query string的鍵 這邊的"keyword"是自定義的
   let page = req.query.page ? parseInt(req.query.page) : 1; //儲存目前所在的頁數 若有page參數則轉為整數,若無則回傳一
   if (!page || page < 1) { //若'page'為undifined 或小於一
      output.redirect = req.baseUrl;
      return res.json(output); //則回第一頁
   }

   let where = " WHERE 1 ";
   if (keyword) {  //若有給關鍵字則執行以下  利用關鍵字在bookname、author欄位做搜尋
      const kw_escaped = db.escape("%" + keyword + "%");//%值 % SQL語法用於模糊匹配    .escape轉換跳脫字元
      where += ` AND ( 
           \`bookname\` LIKE ${kw_escaped}  
           OR
           \`author\` LIKE ${kw_escaped}
           OR
           \`ISBN\` LIKE ${kw_escaped}
           )
         `;
   }

   const t_sql = `SELECT COUNT(1) totalRows FROM book_info ${where}`; //計算符合WHERE的總行數 在上方已經改寫了WHERE內容了
   console.log(t_sql);
   const [[{ totalRows }]] = await db.query(t_sql); //解構賦值
   let totalPages = 0;
   let rows = [];
   if (totalRows) {
      totalPages = Math.ceil(totalRows / perPage);  //將總欄數除以上方設定的每頁資料筆數 來算出總頁數 Math.ceil無條件進位
      if (page > totalPages) {  //當輸入頁數大於最大頁數執行以下
         output.redirect = req.baseUrl + "?page=" + totalPages; //導向最後一頁
         return res.json(output);
      }
      const sql = ` SELECT * FROM book_info ${where} LIMIT ${perPage * (page - 1)
         }, ${perPage}`;
      [rows] = await db.query(sql);
   }
   output = { ...output, totalRows, perPage, totalPages, page, rows, keyword };
   return res.json(output);
});




//主頁展示
router.get("/display", async (req, res) => {
   const category_id = req.query.category_id; // 從 URL 取得前端送過來的 category ID
   const label = req.query.label;
   try {
      const sql = `select * from book_info where category_id=? `
      const [rows] = await db.query(sql, category_id)
      const totalRows = rows.length; // 取得資料總數
      //TO DO 有空可做category_id=1 設為亂數呈現
      if (!rows[0]) {
         return res.status(404).json({ error: '無該分類資料' });
      } else {
         const totalPages = Math.ceil(totalRows / 16);
         let page = req.query.page ? parseInt(req.query.page) : 1;
         if (page > totalPages) {
            const lastPage = totalPages;
            return res.redirect(`${req.baseUrl}?page=${lastPage}`);
         }
         return res.json({ rows, totalRows, category_id, label })
         // res.json({ rows, totalRows })

      }
   } catch (error) {
      console.error('查詢資料庫發生錯誤', error);
      res.status(500).json({ error: '查詢資料庫發生錯誤' });
   }
});

//詳細頁資料
router.get("/detail", async (req, res) => {
   const ISBN = req.query.ISBN; // 從 URL 取得前端送過來的 category ID
   try {
      const sql = `select * from book_info where ISBN=? `
      const [rows] = await db.query(sql, ISBN)
      return res.json({ rows })
      // res.json({ rows, totalRows })
   }
   catch (error) {
      console.error('查詢資料庫發生錯誤', error);
      res.status(500).json({ error: '查詢資料庫發生錯誤' });
   }
});
//麵包屑取值
router.get("/bcs", async (req, res) => {
   const category_id = req.query.category_id; // 從 URL 取得前端送過來的 category ID
   try {
      const sql = `select * from category where category_id=? `
      const [rows] = await db.query(sql, category_id)
      return res.json({ rows })
   } catch (error) {
      console.error('查詢資料庫發生錯誤', error);
      res.status(500).json({ error: '查詢資料庫發生錯誤' });
   }
});




//收藏功能
router.post("/recommand", async (req, res) => {
   const { member_id, ISBN } = req.body
   console.log(member_id)
   try {
      const [rows] = await db.query(`SELECT * FROM recommand WHERE ISBN='${ISBN}' AND member_id=${member_id};`)

      if (rows.length === 0) {
         await db.query(`INSERT INTO recommand (ISBN, member_id, created_date, updated) VALUES (?, ?, ?, ?)`, [ISBN, member_id, currentDateTime, currentDateTime]);
         ; //若無這筆 就新增
      } else { }

      return res.json({ rows })
   } catch (error) {
      console.error('查詢資料庫發生錯誤', error);
      res.status(500).json({ error: '查詢資料庫發生錯誤' });
   }
})
//收藏功能--刪除
router.delete("/recommand", async (req, res) => {
   const { member_id, ISBN } = req.body
   try {
      await db.query(`DELETE FROM recommand WHERE ISBN=${ISBN} AND member_id=${member_id}`);
      return res.json({ message: "刪除成功" });
   } catch {
      console.error('刪除資料庫發生錯誤', error);
      res.status(500).json({ error: '刪除資料庫發生錯誤' });
   }
})
//加入購物車
router.post('/addToCart', async (req, res) => {
   const { member_id, ISBN } = req.body; // 從請求中取得 member_id 和 ISBN
   console.log(member_id)
   console.log(ISBN)
   const checksql = `SELECT count FROM cart WHERE ISBN = ? AND member_id = ?`;
   const [checkresult] = await db.query(checksql, [ISBN, member_id]);
   if (checkresult.length === 0) {
      const createsql = `INSERT INTO cart (member_id, ISBN, count, createAt, updateAt) VALUES (?, ?, 1, ?, ?)`;
      const [result] = await db.query(createsql, [member_id, ISBN, currentDateTime, currentDateTime]);
      res.json(result);
   } else {
      const updatesql = `UPDATE cart SET count = ?, updateAt = ? WHERE ISBN = ? AND member_id = ?`;
      const currentCount = checkresult[0].count;
      const newCount = currentCount + 1;
      const [updateResult] = await db.query(updatesql, [newCount, currentDateTime, ISBN, member_id]);
      res.json(updateResult);
   }
});

//usedList
router.get("/usedList", async (req, res) => {
   const ISBN = req.query.ISBN; // 從 URL 取得前端送過來的 category ID
   try {
      const sql = `select * from used where ISBN=? `
      const [rows] = await db.query(sql, [ISBN])
      return res.json([rows])
   } catch (error) {
      console.error('查詢資料庫發生錯誤', error);
      res.status(500).json({ error: '查詢資料庫發生錯誤' });
   }
});










//錯誤頁面
router.get('/error', (req, res) => {
   db.query('SELECT * FROM book_info', (err, results) => {
      if (err) {
         console.error('資料庫查詢錯誤:', err.message);
         return res.status(500).json({ error: '資料庫查詢錯誤' });
      }
      return res.json(results);
   });
});
module.exports = router;