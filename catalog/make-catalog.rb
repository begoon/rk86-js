def build_file_screens(name) 
  screens = ""
  Dir.glob("%s/%s-*.png" % [name, name]) do |image|
    screen_link = ""
    screen_link = <<-EOS
      <a rel="lightbox[#{name}]" href="#{image}">
        <img src="#{image}" class="screen" />
      </a>
    EOS
    screens << screen_link
  end
  return screens
end

class RK86File
  attr_accessor :name, :start, :end, :size, :entry
  attr_accessor :check_sum, :real_check_sum

  def initialize(name)
    tape_name = "../files/%s" % name
    image = IO.binread(tape_name)

    @name = name

    if name.end_with? ".bin" then
      @size = image.length
      @start = 0
      @entry = 0
      if name.start_with? "mon" then
        @start = 0x10000 - @size
        @entry = @start
      end
      @end = @start + @size - 1
      @real_check_sum = rk86_checksum(image.byteslice(0, @size))
      @check_sum = @real_check_sum
    else 
      i = 0
      i += 1 if image.byteslice(i).ord == 0xe6

      @start = extract_rk86_word(image, i)
      @end = extract_rk86_word(image, i + 2)
      @size = @end - @start + 1
      i += 4

      @real_check_sum = rk86_checksum(image.byteslice(i, @size))
      i += @size

      while image.byteslice(i).ord != 0xe6 do 
        i += 1 
      end
      @check_sum = extract_rk86_word(image, i + 1)
      
      @entry = @start
      @entry = 0x3400 if name == "PVO.GAM"
    end
  end

  def rk86_checksum(v) 
    sum = 0
    j = 0
    while j < v.length - 1 do
      c = v.byteslice(j).ord
      sum = (sum + c + (c << 8)) & 0xffff
      j = j + 1
    end
    c = v.byteslice(j).ord
    sum = (sum + c) & 0xffff
    return sum
  end

  def extract_rk86_word(v, i)
    return (v.byteslice(i).ord << 8) | v.byteslice(i + 1).ord
  end
end

def build_file_entry(name)
  file = RK86File.new name

  descr = File.open("%s/info.md" % name).readlines
  title = descr.shift
  title = title.strip if title != nil
  descr = descr.join.strip

  action = "run"
  action_title = "Запустить"
  
  if name == "JUMP.RK" then
    action = "load"
    action_title = "Загрузить"
  end
  
  file_entry_template = ""
  file_entry_template = <<-EOS
  </style>
  <tr name="#{name}" id="#{name}_section" class="cart">
    <td valign="top" width="40%" class="cart">
      <b id=#{name}_title>#{title}</b>.
      <span id=#{name}_descr>#{descr}</span><br/>
      <hr style="height: 1px solid black"/>
      <table>
        <tr>
          <td>Файл:</td>
          <td>#{name}</td>
        </tr>
        <tr>
          <td>Адреса и длина:</td>
          <td>
            #{ "%04X" % file.start }-#{ "%04X" % file.end },
            #{ "%04X" % file.size }
          </td>
        </tr>
        <tr>
          <td>Стартовый адрес:</td>
          <td>#{ "%04X" % file.entry }</td>
        </tr>
        <tr>
          <td>Контрольная сумма:</td>
          <td>
            #{ "%04X" % file.check_sum }
            #{ "/ <b>Реальная сумма: %04X</b>" % file.real_check_sum if file.check_sum != file.real_check_sum }
          </td>
        </tr>
      </table>
      <button class="#{action}" name="#{name}">#{action_title}</button>
    </td>
    <td valign="top" class="cart">
       #{ build_file_screens(name) }
    </td>
  </tr>
  EOS
end

def build_catalog()
  catalog = ""
  Dir.glob("../files/*").each do |name|
    name = name.split("/")[-1]
    catalog << build_file_entry(name)
  end
  return catalog
end

html_template = ""

html_template = <<EOS
<html>
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8" />
<script src="catalog_main.js"></script>
<script src="js/jquery-1.7.2.min.js"></script>
<script src="js/lightbox.js"></script>
<link href="css/lightbox.css" rel="stylesheet" />
</head>
<body onload="main()">

<style>
img.screen { 
  width: auto; 
  height: 150; 
  vertical-align: text-top;
  margin: 4px;
}
td.cart { 
  border-radius: 15px;
  -moz-border-radius: 15px;
  padding: 1em;
  background: #eee
}
</style>

<!img src="images/rk.gif" style="width: auto; height: 80px"/ >
<h1>Каталог программ для Радио-86РК</h1>
<input type="text" id="search"/>
<small>
Готовые фильты:
<a class="filter">игра</a>,
<a class="filter">бейсик</a>,
<a class="filter">ассемблер</a>
<a class="filter">микрон</a>
</small>
<br/><small>Поиск работает крайне примитивно: карточка программы
игры отображается, если введенное слово длиной три или более символов
встречается в имени файла, названии или описании игры. Например, для
отображения игр введите <i><b>игра</b></i>, или, например,
<i><b>шахматы</b></i>.</small>
<p/>
<table>

#{ build_catalog() }
</table>

</body>
</html>
EOS

Dir.glob("../files/*").each do |x| 
  name = x.split("/")[1]
end

puts html_template
