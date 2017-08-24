var express = require('express')
var app = express()
var fs = require('fs')
    request = require('request')
var https = require('https')
var books = require('google-books-search')
var bodyParser = require('body-parser')
var async = require('async')

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.render('index')
});
app.post('/search_books_list',function(req,res){
  books.search(req.body.search_query, function(error, results) {
     if ( ! error ) {
         res.send(results)
     } else {
         res.send(error)
     }
   })
})

app.post('/download_book',function(req,res){
  var url = "https://books.google.com/books?id="+req.body.book_id+"&pg=1&jscmd=click3&redir_esc=y&hl=en"
  var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  };
  var client = https.get(url,function(response){
      var read_data = ""
      response.on('data', function( data ) {
          read_data += data.toString()
      });
      response.on('end',function(){
        var dir = './images/'+req.body.date;
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        read_data = JSON.parse(read_data )
        
        if(read_data.page && read_data.page.length > 0)
        {  
          var pages = read_data.page;
          //Now go through every page and change page-id in page url
          async.eachSeries(pages,function(page,callback){
            var p_url = "https://books.google.com/books?id="+req.body.book_id+"&pg=page_id&jscmd=click3&redir_esc=y&hl=en"
            var page_url = p_url.replace('page_id',page.pid)
            
            var request = https.get(page_url, function(response) {
                var page_read_data = ""
                response.on('data', function( page_data ) {
                    page_read_data += page_data.toString()
                })
                response.on('end',function(){
                  page_read_data = JSON.parse(page_read_data )
                  if(page_read_data.page && page_read_data.page[0]){  
                    var image_url = page_read_data.page[0].src.replace('\u0026',"&")
                    var image_name = page_read_data.page[0].pid+".png"
                    download(image_url, dir+'/'+image_name, function(){
                        console.log(image_name+' downloaded');
                    });
                  }
                  callback()
                })
            });
            request.end()
          },function done(){
            res.end()
          })
          res.end()
        }  
        else {
          res.status(404).end()
        }
      });
      
      response.on('error',function(err){
          res.send({ error:true, msg:err})
      });
  });
  client.end();
  
})

var server = app.listen(8081, function () {
   console.log("Example app listening at http://%s:%s", server.address().address, 8081)
})


